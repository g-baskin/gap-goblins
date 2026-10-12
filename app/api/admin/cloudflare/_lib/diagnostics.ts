import type { CloudflareDnsRecord, CloudflareOriginConfig } from "@/lib/cloudflare/types";

export type CloudflareDiagnosticSeverity = "ok" | "warning" | "missing" | "info";

export interface CloudflareDomainDiagnostic {
  key: "apex" | "www" | "hooks" | "webhooks";
  label: string;
  expectedName: string;
  expectedType: "A" | "CNAME";
  expectedContent: string | null;
  expectedProxied: boolean;
  status: CloudflareDiagnosticSeverity;
  message: string;
  records: CloudflareDnsRecord[];
}

export interface RailwayVerificationRecord {
  id: string;
  name: string;
  content: string;
  comment?: string;
  modifiedOn?: string;
}

export interface CloudflareDiagnostics {
  zoneName: string | null;
  origin: CloudflareOriginConfig;
  railwayTarget: string | null;
  domainMapping: CloudflareDomainDiagnostic[];
  railwayVerificationTxtRecords: RailwayVerificationRecord[];
}

interface ExpectedDomainMapping {
  key: CloudflareDomainDiagnostic["key"];
  label: string;
  name: string;
  expectedType: "A" | "CNAME";
  expectedContent: string | null;
  expectedProxied: boolean;
}

const WEBHOOK_SUBDOMAINS = new Set(["hooks", "webhooks"]);

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function recordLabel(record: CloudflareDnsRecord): string {
  const parts = [`${record.type} ${record.name}`];
  if (typeof record.proxied === "boolean") {
    parts.push(record.proxied ? "proxied" : "DNS-only");
  }
  return parts.join(" ");
}

function relativeName(recordName: string, zoneName: string | null): string {
  const normalizedRecordName = normalizeName(recordName);
  const normalizedZoneName = zoneName ? normalizeName(zoneName) : null;

  if (!normalizedZoneName) return normalizedRecordName;
  if (normalizedRecordName === normalizedZoneName) return "@";
  if (normalizedRecordName.endsWith(`.${normalizedZoneName}`)) {
    return normalizedRecordName.slice(0, -(normalizedZoneName.length + 1));
  }

  return normalizedRecordName;
}

function isRelevantRecord(
  record: CloudflareDnsRecord,
  expectedName: string,
  zoneName: string | null,
): boolean {
  const normalizedExpectedName = normalizeName(expectedName);
  const normalizedRecordName = normalizeName(record.name);
  const normalizedZoneName = zoneName ? normalizeName(zoneName) : null;

  if (normalizedExpectedName === "@") {
    return Boolean(normalizedZoneName && normalizedRecordName === normalizedZoneName);
  }

  if (normalizedZoneName && normalizedExpectedName === normalizedZoneName) {
    return normalizedRecordName === normalizedZoneName;
  }

  if (!normalizedZoneName) return normalizedRecordName === normalizedExpectedName;
  return normalizedRecordName === `${normalizedExpectedName}.${normalizedZoneName}`;
}

function expectedMappings(
  zoneName: string | null,
  origin: CloudflareOriginConfig,
): ExpectedDomainMapping[] {
  const apexName = zoneName ? normalizeName(zoneName) : "@";

  return [
    {
      key: "apex",
      label: "Apex domain",
      name: apexName,
      expectedType: origin.apex.type,
      expectedContent: origin.apex.content,
      expectedProxied: origin.apex.proxied,
    },
    {
      key: "www",
      label: "www subdomain",
      name: "www",
      expectedType: origin.subdomain.type,
      expectedContent: origin.subdomain.content,
      expectedProxied: origin.subdomain.proxied,
    },
    {
      key: "hooks",
      label: "hooks webhook subdomain",
      name: "hooks",
      expectedType: origin.webhook.type,
      expectedContent: origin.webhook.content,
      expectedProxied: origin.webhook.proxied,
    },
    {
      key: "webhooks",
      label: "webhooks webhook subdomain",
      name: "webhooks",
      expectedType: origin.webhook.type,
      expectedContent: origin.webhook.content,
      expectedProxied: origin.webhook.proxied,
    },
  ];
}

function evaluateDomainMapping(
  records: CloudflareDnsRecord[],
  zoneName: string | null,
  mapping: ExpectedDomainMapping,
): CloudflareDomainDiagnostic {
  const matchingRecords = records
    .filter((record) => isRelevantRecord(record, mapping.name, zoneName))
    .sort((a, b) => recordLabel(a).localeCompare(recordLabel(b)));

  const proxiableRecords = matchingRecords.filter(
    (record) => record.type === "A" || record.type === "AAAA" || record.type === "CNAME",
  );

  if (!mapping.expectedContent) {
    return {
      key: mapping.key,
      label: mapping.label,
      expectedName: mapping.name,
      expectedType: mapping.expectedType,
      expectedContent: mapping.expectedContent,
      expectedProxied: mapping.expectedProxied,
      status: "warning",
      message: "No origin target is configured for this provider, so DNS cannot be synced yet.",
      records: matchingRecords,
    };
  }

  if (proxiableRecords.length === 0) {
    return {
      key: mapping.key,
      label: mapping.label,
      expectedName: mapping.name,
      expectedType: mapping.expectedType,
      expectedContent: mapping.expectedContent,
      expectedProxied: mapping.expectedProxied,
      status: mapping.key === "webhooks" ? "info" : "missing",
      message:
        mapping.key === "webhooks"
          ? "Optional webhook bypass host is not present. If added later, keep it DNS-only."
          : `No ${mapping.expectedType} record found for ${mapping.label}.`,
      records: matchingRecords,
    };
  }

  const hasExpectedRecord = proxiableRecords.some(
    (record) =>
      record.type === mapping.expectedType &&
      normalizeName(record.content) === normalizeName(mapping.expectedContent ?? "") &&
      record.proxied === mapping.expectedProxied,
  );

  if (hasExpectedRecord) {
    return {
      key: mapping.key,
      label: mapping.label,
      expectedName: mapping.name,
      expectedType: mapping.expectedType,
      expectedContent: mapping.expectedContent,
      expectedProxied: mapping.expectedProxied,
      status: "ok",
      message: mapping.expectedProxied
        ? `${mapping.label} points to the selected origin and is proxied through Cloudflare.`
        : `${mapping.label} points to the selected origin and is DNS-only as expected for webhook bypass.`,
      records: matchingRecords,
    };
  }

  return {
    key: mapping.key,
    label: mapping.label,
    expectedName: mapping.name,
    expectedType: mapping.expectedType,
    expectedContent: mapping.expectedContent,
    expectedProxied: mapping.expectedProxied,
    status: "warning",
    message: `${mapping.label} should be a ${mapping.expectedType} record pointing to ${mapping.expectedContent} and ${mapping.expectedProxied ? "proxied through Cloudflare" : "DNS-only"}.`,
    records: matchingRecords,
  };
}

function isRailwayVerificationTxtRecord(
  record: CloudflareDnsRecord,
  zoneName: string | null,
): boolean {
  if (record.type !== "TXT") return false;

  const normalizedContent = record.content.toLowerCase();
  const name = relativeName(record.name, zoneName);

  return (
    normalizedContent.includes("railway") ||
    name.includes("railway") ||
    name.includes("_cf-custom-hostname")
  );
}

export function buildCloudflareDiagnostics(options: {
  records: CloudflareDnsRecord[];
  zoneName: string | null;
  origin: CloudflareOriginConfig;
  railwayTarget: string | null;
}): CloudflareDiagnostics {
  const sortedRecords = [...options.records].sort((a, b) =>
    recordLabel(a).localeCompare(recordLabel(b)),
  );

  return {
    zoneName: options.zoneName,
    origin: options.origin,
    railwayTarget: options.railwayTarget,
    domainMapping: expectedMappings(options.zoneName, options.origin).map((mapping) =>
      evaluateDomainMapping(sortedRecords, options.zoneName, mapping),
    ),
    railwayVerificationTxtRecords: sortedRecords
      .filter((record) => isRailwayVerificationTxtRecord(record, options.zoneName))
      .map((record) => ({
        id: record.id,
        name: record.name,
        content: record.content,
        comment: record.comment,
        modifiedOn: record.modified_on,
      })),
  };
}

export function isWebhookBypassRecord(
  record: CloudflareDnsRecord,
  zoneName: string | null,
): boolean {
  const name = relativeName(record.name, zoneName);
  return WEBHOOK_SUBDOMAINS.has(name);
}
