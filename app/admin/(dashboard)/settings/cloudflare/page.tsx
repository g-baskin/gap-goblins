"use client";

import {
  IconAlertTriangle,
  IconBrandCloudflare,
  IconCheck,
  IconCircleX,
  IconHelpCircle,
  IconLoader2,
  IconMailForward,
  IconMailPlus,
  IconRefresh,
  IconRoute,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/ui/dialog";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Separator } from "@/components/shadcn/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import type {
  CloudflareApiMessage,
  CloudflareDnsRecord,
  CloudflareDnsRecordInput,
  CloudflareEmailDestinationAddress,
  CloudflareEmailRoutingAction,
  CloudflareEmailRoutingMatcher,
  CloudflareEmailRoutingRule,
  CloudflareEmailRoutingSettings,
  CloudflareOriginConfig,
  CloudflareRedirectRule,
  CloudflareRuleset,
  CloudflareSingleRedirectStatusCode,
  CloudflareSingleRedirectTargetUrl,
  CloudflareZoneSummary,
} from "@/lib/cloudflare/types";

const CLOUDFLARE_ENV_VARS = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_ZONE_NAME",
  "CLOUDFLARE_ORIGIN_PROVIDER",
  "CLOUDFLARE_ORIGIN_TARGET",
  "CLOUDFLARE_RAILWAY_TARGET",
] as const;

const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308] as const;

type CloudflareEnvVarName = (typeof CLOUDFLARE_ENV_VARS)[number];
type CloudflareDiagnosticSeverity = "ok" | "warning" | "missing" | "info";
type CloudflareDomainKey = "apex" | "www" | "hooks" | "webhooks";
type MutationAction = "dns" | "redirect" | "email-routing" | "destination" | "forwarding-alias";
type RedirectTargetMode = "value" | "expression";

type PublicCloudflareMeta = {
  method: string;
  status: number;
  elapsedMs: number;
  cfRay?: string;
  resultInfo?: {
    count?: number;
    page?: number;
    per_page?: number;
    total_count?: number;
    total_pages?: number;
  };
};

type PublicCloudflareError = {
  kind: string;
  message: string;
  status?: number;
  code?: number | string;
  missingEnv?: CloudflareEnvVarName[];
};

type CloudflareConfigStatus = {
  configured: boolean;
  apiConfigured: boolean;
  projectConfigured: boolean;
  env: Record<CloudflareEnvVarName, boolean>;
  missing: CloudflareEnvVarName[];
  zoneName: string | null;
  selectedZoneName: string | null;
  origin: CloudflareOriginConfig;
  railwayTarget: string | null;
};

type PublicCredentialStatus = {
  account: {
    name: string;
    type?: string;
  };
  zone: {
    name: string;
    status?: string;
    type?: string;
    accountName?: string;
  };
  zoneNameMatchesEnv: boolean | null;
};

type CloudflareDomainDiagnostic = {
  key: CloudflareDomainKey;
  label: string;
  expectedName: string;
  expectedType: "A" | "CNAME";
  expectedContent: string | null;
  expectedProxied: boolean;
  status: CloudflareDiagnosticSeverity;
  message: string;
  records: CloudflareDnsRecord[];
};

type RailwayVerificationRecord = {
  id: string;
  name: string;
  content: string;
  comment?: string;
  modifiedOn?: string;
};

type CloudflareDiagnostics = {
  zoneName: string | null;
  origin: CloudflareOriginConfig;
  railwayTarget: string | null;
  domainMapping: CloudflareDomainDiagnostic[];
  railwayVerificationTxtRecords: RailwayVerificationRecord[];
};

type CloudflareStatusResponse = {
  config: CloudflareConfigStatus;
  zones:
    | {
        ok: true;
        domains: CloudflareZoneSummary[];
        messages: CloudflareApiMessage[];
        meta?: PublicCloudflareMeta;
      }
    | {
        ok: false;
        domains: CloudflareZoneSummary[];
        error: PublicCloudflareError;
        meta?: PublicCloudflareMeta;
      };
  credentials:
    | {
        ok: true;
        data: PublicCredentialStatus;
        messages: CloudflareApiMessage[];
        meta?: PublicCloudflareMeta;
      }
    | {
        ok: false;
        error: PublicCloudflareError;
        meta?: PublicCloudflareMeta;
      };
  emailRouting:
    | {
        ok: true;
        settings: CloudflareEmailRoutingSettings;
        messages: CloudflareApiMessage[];
        meta?: PublicCloudflareMeta;
      }
    | {
        ok: false;
        error: PublicCloudflareError;
        meta?: PublicCloudflareMeta;
      };
  diagnostics: CloudflareDiagnostics;
  dnsMeta?: PublicCloudflareMeta;
  dnsError: PublicCloudflareError | null;
};

type DnsRecordsResponse = {
  records: CloudflareDnsRecord[];
  messages: CloudflareApiMessage[];
  meta?: PublicCloudflareMeta;
};

type RedirectsResponse = {
  ruleset: CloudflareRuleset;
  messages: CloudflareApiMessage[];
  meta?: PublicCloudflareMeta;
};

type EmailDestinationsResponse = {
  destinations: CloudflareEmailDestinationAddress[];
  messages: CloudflareApiMessage[];
  meta?: PublicCloudflareMeta;
};

type EmailRulesResponse = {
  rules: CloudflareEmailRoutingRule[];
  messages: CloudflareApiMessage[];
  meta?: PublicCloudflareMeta;
};

type RedirectFormState = {
  selectedRuleKey: string;
  expression: string;
  targetMode: RedirectTargetMode;
  target: string;
  statusCode: `${CloudflareSingleRedirectStatusCode}`;
  description: string;
  enabled: boolean;
  preserveQueryString: boolean;
};

type RedirectRuleInput = {
  expression: string;
  targetUrl: CloudflareSingleRedirectTargetUrl;
  statusCode: CloudflareSingleRedirectStatusCode;
  description?: string;
  ref?: string;
  enabled?: boolean;
  preserveQueryString?: boolean;
};

type HelpDetailSection = {
  title: string;
  body: string;
};

type HelpContent = {
  title: string;
  summary: string;
  sections: HelpDetailSection[];
};

const NEW_REDIRECT_KEY = "new";

const HELP_CONTENT = {
  domainSelector: {
    title: "Domain selector",
    summary:
      "Chooses the Cloudflare zone this page reads from and writes to. A zone is the domain container inside Cloudflare, such as example.com.",
    sections: [
      {
        title: "Domain dropdown",
        body: "Lists the zones available to the configured Cloudflare account and API token. Changing it reloads DNS records, redirects, diagnostics, and email rules for that selected domain.",
      },
      {
        title: "Selected domain",
        body: "Shows the active zone name currently being inspected. All mutation buttons on this page target this zone, not every domain in the account.",
      },
      {
        title: "Template setting note",
        body: "This module is environment-driven. Every deployment or client build needs its own Cloudflare token, account ID, zone ID, and zone name, so the app never stores these secrets in the database.",
      },
    ],
  },
  credentialStatus: {
    title: "Credential and config status",
    summary:
      "Shows whether the server has the environment variables needed to talk to Cloudflare and whether those credentials match the selected domain.",
    sections: [
      {
        title: "Overall config",
        body: "Configured means the required Cloudflare project values are present. Missing required values means at least one required environment variable is absent, so some reads or updates can fail.",
      },
      {
        title: "Origin provider and origin target",
        body: "The origin provider is the hosting platform Cloudflare should route web traffic to. The origin target is the DNS target or host Cloudflare should point at, usually a Railway-provided domain for this app.",
      },
      {
        title: "Environment variable badges",
        body: "Each badge only says Set or Missing. Secret values are intentionally hidden. API token and account values let the app call Cloudflare, zone values identify the domain, and origin values tell the DNS sync what records to create.",
      },
      {
        title: "Account and zone check",
        body: "Confirms the token can access the Cloudflare account and selected zone. Env zone matches Cloudflare tells you whether the configured domain name lines up with the zone returned by Cloudflare.",
      },
    ],
  },
  domainDiagnostics: {
    title: "Domain mapping diagnostics",
    summary:
      "Compares the important DNS records in Cloudflare against the records this app expects for website traffic and webhook traffic.",
    sections: [
      {
        title: "Apex record",
        body: "The bare domain, such as example.com. It should point to the configured origin so visitors can load the site without www.",
      },
      {
        title: "www record",
        body: "The www hostname, such as www.example.com. It usually points to the same origin or redirects to the apex domain, depending on the DNS and redirect setup.",
      },
      {
        title: "hooks and webhooks records",
        body: "Webhook hostnames are used by services such as Cal.com to POST events into the app. They must stay DNS-only so Cloudflare Bot Fight Mode or proxy rules do not block webhook requests before Railway receives them.",
      },
      {
        title: "Status and message",
        body: "Each card shows the expected record type, name, target, proxy mode, current matching records, and a diagnostic message explaining whether the record looks healthy, missing, or misconfigured.",
      },
      {
        title: "Sync expected DNS mapping",
        body: "For super admins, this button creates or updates the apex, www, hooks, and webhooks DNS records from the configured origin values. Hooks and webhooks are always submitted as DNS-only for safety.",
      },
    ],
  },
  dnsRecords: {
    title: "DNS records",
    summary:
      "Shows the raw DNS records Cloudflare returned for the selected domain so you can inspect what currently exists.",
    sections: [
      {
        title: "Type",
        body: "The DNS record kind. Common examples are A for an IP address, CNAME for an alias to another hostname, MX for mail routing, TXT for verification, and AAAA for IPv6.",
      },
      {
        title: "Name",
        body: "The hostname the record applies to. The apex domain, www, hooks, webhooks, and email-related hostnames can all appear here.",
      },
      {
        title: "Content",
        body: "The target value Cloudflare returns for the record, such as an IP address, Railway hostname, verification text, mail server, or another domain name.",
      },
      {
        title: "Proxy",
        body: "Proxied means traffic goes through Cloudflare's orange-cloud proxy. DNS-only means Cloudflare only answers DNS and the request goes directly to the target. Webhook hostnames should remain DNS-only.",
      },
      {
        title: "TTL and modified",
        body: "TTL is how long DNS resolvers can cache the record. Auto means Cloudflare manages it. Modified shows when Cloudflare says the record was last changed.",
      },
    ],
  },
  redirects: {
    title: "Redirects",
    summary:
      "Manages Cloudflare Single Redirect rules for the selected zone. Redirects send matching visitors from one URL or hostname to another.",
    sections: [
      {
        title: "Rules table",
        body: "Shows existing redirect rules, their Cloudflare expression, destination target, HTTP status code, and whether each rule is enabled.",
      },
      {
        title: "Rule to update",
        body: "Choose an existing rule to edit or create a new one. The form only saves to Cloudflare when you press Add/update redirect.",
      },
      {
        title: "Expression",
        body: "The Cloudflare filter deciding which requests match the redirect. For example, it can match a hostname such as www.example.com or a path pattern.",
      },
      {
        title: "HTTP status",
        body: "301 and 308 are permanent redirects. 302, 303, and 307 are temporary-style redirects. Permanent redirects can be cached aggressively by browsers and search engines.",
      },
      {
        title: "Target mode and target",
        body: "Static URL sends every matching request to one fixed URL. Expression mode builds the target dynamically with Cloudflare's expression language.",
      },
      {
        title: "Enabled and preserve query string",
        body: "Enabled turns the rule on. Preserve query string keeps tracking parameters and other query values from the original request when redirecting.",
      },
    ],
  },
  emailRoutingStatus: {
    title: "Email Routing status",
    summary:
      "Shows whether Cloudflare Email Routing is active for the selected zone. Email Routing forwards inbound domain mail without hosting a mailbox in Cloudflare.",
    sections: [
      {
        title: "Enabled",
        body: "Enabled means Cloudflare Email Routing is turned on for the zone. Disabled means aliases and forwarding rules will not process inbound mail yet.",
      },
      {
        title: "Status",
        body: "Cloudflare's routing status. Ready or active means routing can work once DNS and destination verification are correct. Pending or error means setup still needs attention.",
      },
      {
        title: "Routing name",
        body: "The Cloudflare label for this zone's Email Routing configuration. It helps identify which routing setup the API returned.",
      },
      {
        title: "Enable email routing button",
        body: "For super admins, this asks Cloudflare to enable Email Routing. DNS MX and TXT records may still need to be present before inbound mail forwards correctly.",
      },
    ],
  },
  destinationAddresses: {
    title: "Destination addresses",
    summary:
      "Lists the real inboxes Cloudflare is allowed to forward messages to, such as an operations or admin mailbox.",
    sections: [
      {
        title: "Destination email",
        body: "A mailbox outside Cloudflare that receives forwarded mail. Aliases cannot forward to an address until Cloudflare knows about it as a destination.",
      },
      {
        title: "Verified and pending",
        body: "Verified means the mailbox owner has confirmed Cloudflare's verification email. Pending means Cloudflare may not forward mail to that destination yet.",
      },
      {
        title: "Add destination address",
        body: "For super admins, this submits a new destination mailbox to Cloudflare. The mailbox owner may need to click Cloudflare's verification email before it works.",
      },
    ],
  },
  forwardingAliases: {
    title: "Forwarding aliases",
    summary:
      "Shows and creates inbound email aliases for the domain, such as hello@example.com forwarding to a verified destination inbox.",
    sections: [
      {
        title: "Alias address",
        body: "The public address people send email to at this domain. It should be on the selected zone, for example hello@example.com.",
      },
      {
        title: "Forward to",
        body: "The verified destination mailbox that receives mail sent to the alias. This should usually be one of the destination addresses listed above.",
      },
      {
        title: "Matchers and actions",
        body: "Matchers define which inbound messages a rule catches. Actions define what Cloudflare does with matching mail, usually forwarding it to one or more destination addresses.",
      },
      {
        title: "Enabled badge",
        body: "Enabled rules are active. Disabled rules remain configured in Cloudflare but do not forward mail until turned back on.",
      },
    ],
  },
  railwayVerification: {
    title: "Railway verification TXT",
    summary:
      "Lists TXT records that look like Railway domain-verification records so you can confirm Railway can prove domain ownership.",
    sections: [
      {
        title: "TXT record name",
        body: "The DNS name Railway asked you to create. It can be on the apex, a subdomain, or a verification-specific hostname.",
      },
      {
        title: "TXT record content",
        body: "The verification value Railway checks. Cloudflare must return this exact content for Railway to validate the custom domain.",
      },
      {
        title: "Modified time",
        body: "When Cloudflare says the TXT record last changed. If Railway still cannot verify the domain, DNS caching or an incorrect value may be the reason.",
      },
    ],
  },
} satisfies Record<string, HelpContent>;

function withZoneQuery(path: string, zoneName: string | null): string {
  if (!zoneName) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}zoneName=${encodeURIComponent(zoneName)}`;
}

const EMPTY_REDIRECT_FORM: RedirectFormState = {
  selectedRuleKey: NEW_REDIRECT_KEY,
  expression: 'http.host eq "www.example.com"',
  targetMode: "value",
  target: "https://example.com",
  statusCode: "301",
  description: "",
  enabled: true,
  preserveQueryString: true,
};

async function fetchJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "application/json",
    },
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with HTTP ${response.status}`));
  }

  return payload as TResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  if (typeof payload.error === "string") return payload.error;

  const cloudflare = payload.cloudflare;
  if (isRecord(cloudflare)) {
    const cloudflareError = cloudflare.error;
    if (isRecord(cloudflareError) && typeof cloudflareError.message === "string") {
      return cloudflareError.message;
    }
  }

  return fallback;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not checked";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatTtl(value: number | undefined): string {
  if (value === 1) return "Auto";
  if (!value) return "—";
  return `${value}s`;
}

function statusBadgeVariant(status: string | boolean | null | undefined) {
  if (status === true || status === "ok" || status === "ready" || status === "active") {
    return "default" as const;
  }
  if (status === false || status === "missing" || status === "misconfigured") {
    return "destructive" as const;
  }
  if (status === "warning" || status === "pending" || status === "unconfigured") {
    return "secondary" as const;
  }
  return "outline" as const;
}

function StatusBadge({
  status,
  children,
}: {
  status: string | boolean | null | undefined;
  children: string;
}) {
  return <Badge variant={statusBadgeVariant(status)}>{children}</Badge>;
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm leading-snug text-foreground">{value}</p>
    </div>
  );
}

function EnvVarStatus({ name, isSet }: { name: CloudflareEnvVarName; isSet: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <p className="break-all font-mono text-xs leading-snug text-foreground">{name}</p>
      <StatusBadge status={isSet}>{isSet ? "Set" : "Missing"}</StatusBadge>
    </div>
  );
}

function LabeledStatusRow({
  label,
  status,
  children,
}: {
  label: string;
  status: string | boolean;
  children: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <StatusBadge status={status}>{children}</StatusBadge>
    </div>
  );
}

function DomainMappingDiagnosticCard({ mapping }: { mapping: CloudflareDomainDiagnostic }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">{mapping.label}</p>
          <p className="break-all text-xs leading-relaxed text-muted-foreground">
            Expected: {mapping.expectedType} {mapping.expectedName} →{" "}
            {mapping.expectedContent ?? "not configured"},{" "}
            {mapping.expectedProxied ? "proxied" : "DNS-only"}
          </p>
        </div>
        <StatusBadge status={mapping.status}>{mapping.status}</StatusBadge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{mapping.message}</p>
      {mapping.records.length > 0 && (
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-2">
          {mapping.records.map((record) => (
            <p key={record.id} className="break-all text-xs leading-relaxed text-muted-foreground">
              {record.type} {record.name} → {record.content}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingRow({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <IconLoader2 className="size-4 animate-spin" />
      {message}
    </div>
  );
}

function HelpButton({ content }: { content: HelpContent }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0 rounded-full"
          aria-label={`Explain ${content.title}`}
        >
          <IconHelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {content.sections.map((section) => (
            <section key={section.title} className="rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpedCardHeader({
  title,
  description,
  help,
}: {
  title: string;
  description: string;
  help: HelpContent;
}) {
  return (
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <HelpButton content={help} />
      </div>
    </CardHeader>
  );
}

function recordMatchesDnsMapping(record: CloudflareDnsRecord): boolean {
  return record.type === "A" || record.type === "AAAA" || record.type === "CNAME";
}

function buildExpectedDnsRecord(
  mapping: CloudflareDomainDiagnostic,
): CloudflareDnsRecordInput | null {
  if (!mapping.expectedContent) return null;

  if (mapping.expectedType === "A") {
    return {
      type: "A",
      name: mapping.expectedName,
      content: mapping.expectedContent,
      ttl: 1,
      proxied: mapping.expectedProxied,
      comment: "Managed by CRM Cloudflare settings.",
    };
  }

  return {
    type: "CNAME",
    name: mapping.expectedName,
    content: mapping.expectedContent,
    ttl: 1,
    proxied: mapping.expectedProxied,
    comment:
      mapping.key === "hooks" || mapping.key === "webhooks"
        ? "Managed by CRM Cloudflare settings. Keep DNS-only for webhook bypass."
        : "Managed by CRM Cloudflare settings.",
  };
}

function findMappingRecordId(mapping: CloudflareDomainDiagnostic): string | undefined {
  return mapping.records.find(recordMatchesDnsMapping)?.id;
}

function getRedirectRuleKey(rule: CloudflareRedirectRule, index: number): string {
  return rule.id ?? rule.ref ?? `${rule.expression ?? "redirect"}-${index}`;
}

function isRedirectStatusCode(value: unknown): value is CloudflareSingleRedirectStatusCode {
  return REDIRECT_STATUS_CODES.some((statusCode) => statusCode === value);
}

function normalizeRedirectTarget(
  targetUrl: CloudflareSingleRedirectTargetUrl | undefined,
): CloudflareSingleRedirectTargetUrl | null {
  if (!targetUrl) return null;
  if ("value" in targetUrl && typeof targetUrl.value === "string" && targetUrl.value) {
    return { value: targetUrl.value };
  }
  if (
    "expression" in targetUrl &&
    typeof targetUrl.expression === "string" &&
    targetUrl.expression
  ) {
    return { expression: targetUrl.expression };
  }
  return null;
}

function redirectRuleToInput(rule: CloudflareRedirectRule): RedirectRuleInput | null {
  if (!rule.expression) return null;

  const fromValue = rule.action_parameters?.from_value;
  const targetUrl = normalizeRedirectTarget(fromValue?.target_url);
  const statusCode = fromValue?.status_code;

  if (!targetUrl || !isRedirectStatusCode(statusCode)) return null;

  return {
    expression: rule.expression,
    targetUrl,
    statusCode,
    description: rule.description || undefined,
    ref: rule.ref || undefined,
    enabled: rule.enabled,
    preserveQueryString: fromValue?.preserve_query_string,
  };
}

function redirectFormToInput(
  form: RedirectFormState,
  existing?: CloudflareRedirectRule,
): RedirectRuleInput {
  const targetUrl: CloudflareSingleRedirectTargetUrl =
    form.targetMode === "expression" ? { expression: form.target } : { value: form.target };

  return {
    expression: form.expression,
    targetUrl,
    statusCode: Number(form.statusCode) as CloudflareSingleRedirectStatusCode,
    description: form.description.trim() || undefined,
    ref: existing?.ref || undefined,
    enabled: form.enabled,
    preserveQueryString: form.preserveQueryString,
  };
}

function redirectRuleToForm(
  rule: CloudflareRedirectRule,
  key: string,
  fallback: RedirectFormState,
): RedirectFormState {
  const fromValue = rule.action_parameters?.from_value;
  const targetUrl = fromValue?.target_url;
  const targetMode: RedirectTargetMode =
    targetUrl && "expression" in targetUrl ? "expression" : "value";
  const target =
    targetUrl && "expression" in targetUrl
      ? (targetUrl.expression ?? "")
      : targetUrl && "value" in targetUrl
        ? (targetUrl.value ?? "")
        : fallback.target;
  const statusCode: RedirectFormState["statusCode"] = isRedirectStatusCode(fromValue?.status_code)
    ? `${fromValue.status_code}`
    : fallback.statusCode;

  return {
    selectedRuleKey: key,
    expression: rule.expression ?? fallback.expression,
    targetMode,
    target,
    statusCode,
    description: rule.description ?? "",
    enabled: rule.enabled ?? true,
    preserveQueryString: fromValue?.preserve_query_string ?? true,
  };
}

function describeRedirectTarget(rule: CloudflareRedirectRule): string {
  const targetUrl = rule.action_parameters?.from_value?.target_url;
  if (!targetUrl) return "—";
  if ("value" in targetUrl && targetUrl.value) return targetUrl.value;
  if ("expression" in targetUrl && targetUrl.expression) return targetUrl.expression;
  return "—";
}

function describeMatchers(matchers: CloudflareEmailRoutingMatcher[] | undefined): string {
  if (!matchers || matchers.length === 0) return "—";
  return matchers
    .map((matcher) => {
      if (matcher.type === "all") return "All inbound mail";
      return matcher.value;
    })
    .join(", ");
}

function describeForwardingActions(actions: CloudflareEmailRoutingAction[] | undefined): string {
  if (!actions || actions.length === 0) return "—";
  return actions
    .map((action) => {
      if (action.type === "forward") return action.value.join(", ");
      if (action.type === "drop") return "Drop message";
      return `Worker: ${action.value.join(", ")}`;
    })
    .join("; ");
}

function getFirstDestinationEmail(destinations: CloudflareEmailDestinationAddress[]): string {
  return destinations.find((destination) => destination.email)?.email ?? "ops@example.com";
}

function requireSuperAdminMessage(isSuperAdmin: boolean): string | null {
  return isSuperAdmin ? null : "Only super admins can change Cloudflare settings.";
}

export default function CloudflareSettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [isHydrated, setIsHydrated] = useState(false);

  const [status, setStatus] = useState<CloudflareStatusResponse | null>(null);
  const [dnsRecords, setDnsRecords] = useState<CloudflareDnsRecord[]>([]);
  const [redirectRuleset, setRedirectRuleset] = useState<CloudflareRuleset | null>(null);
  const [destinations, setDestinations] = useState<CloudflareEmailDestinationAddress[]>([]);
  const [emailRules, setEmailRules] = useState<CloudflareEmailRoutingRule[]>([]);
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<MutationAction | null>(null);

  const [redirectForm, setRedirectForm] = useState<RedirectFormState>(EMPTY_REDIRECT_FORM);
  const [destinationEmail, setDestinationEmail] = useState("");
  const [aliasEmail, setAliasEmail] = useState("");
  const [aliasDestinationEmail, setAliasDestinationEmail] = useState("");

  const superAdminWarning = requireSuperAdminMessage(isSuperAdmin);
  const zoneOptions = status?.zones.domains ?? [];
  const zoneName =
    selectedZoneName ?? status?.config.selectedZoneName ?? status?.diagnostics.zoneName ?? null;
  const origin = status?.config.origin ?? status?.diagnostics.origin ?? null;
  const originTarget = origin?.target ?? null;

  const redirectRuleOptions = useMemo(
    () =>
      redirectRuleset?.rules.map((rule, index) => ({
        key: getRedirectRuleKey(rule, index),
        label: rule.description || rule.expression || `Redirect ${index + 1}`,
        rule,
      })) ?? [],
    [redirectRuleset],
  );

  const loadCloudflare = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const errors: string[] = [];
    let zoneQuery = selectedZoneName;

    try {
      const statusResult = await fetchJson<CloudflareStatusResponse>(
        withZoneQuery("/api/admin/cloudflare/status", zoneQuery),
      );
      setStatus(statusResult);
      zoneQuery = selectedZoneName ?? statusResult.config.selectedZoneName;
    } catch (error) {
      errors.push(`Status: ${errorToMessage(error)}`);
    }

    const [dnsResult, redirectsResult, destinationsResult, rulesResult] = await Promise.allSettled([
      fetchJson<DnsRecordsResponse>(
        withZoneQuery("/api/admin/cloudflare/dns/records?perPage=100", zoneQuery),
      ),
      fetchJson<RedirectsResponse>(withZoneQuery("/api/admin/cloudflare/redirects", zoneQuery)),
      fetchJson<EmailDestinationsResponse>("/api/admin/cloudflare/email/destinations?perPage=100"),
      fetchJson<EmailRulesResponse>(
        withZoneQuery("/api/admin/cloudflare/email/rules?perPage=100", zoneQuery),
      ),
    ]);

    if (dnsResult.status === "fulfilled") {
      setDnsRecords(dnsResult.value.records);
    } else {
      errors.push(`DNS records: ${errorToMessage(dnsResult.reason)}`);
    }

    if (redirectsResult.status === "fulfilled") {
      setRedirectRuleset(redirectsResult.value.ruleset);
    } else {
      setRedirectRuleset(null);
      errors.push(`Redirects: ${errorToMessage(redirectsResult.reason)}`);
    }

    if (destinationsResult.status === "fulfilled") {
      setDestinations(destinationsResult.value.destinations);
      setAliasDestinationEmail(
        (current) => current || getFirstDestinationEmail(destinationsResult.value.destinations),
      );
    } else {
      errors.push(`Destination addresses: ${errorToMessage(destinationsResult.reason)}`);
    }

    if (rulesResult.status === "fulfilled") {
      setEmailRules(rulesResult.value.rules);
    } else {
      errors.push(`Forwarding aliases: ${errorToMessage(rulesResult.reason)}`);
    }

    setLoadError(errors.length > 0 ? errors.join(" ") : null);
    setIsLoading(false);
  }, [selectedZoneName]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void loadCloudflare();
  }, [isHydrated, loadCloudflare]);

  const handleZoneSelect = (zoneNameValue: string) => {
    setSelectedZoneName(zoneNameValue);
    setDnsRecords([]);
    setRedirectRuleset(null);
    setEmailRules([]);
    setRedirectForm({ ...EMPTY_REDIRECT_FORM });
  };

  const handleSyncDnsMapping = async () => {
    if (!status?.diagnostics) return;
    if (!origin?.isConfigured) {
      toast.error(
        "Configure CLOUDFLARE_ORIGIN_PROVIDER and CLOUDFLARE_ORIGIN_TARGET before syncing DNS",
      );
      return;
    }

    setMutatingAction("dns");
    try {
      let syncedCount = 0;
      for (const mapping of status.diagnostics.domainMapping) {
        const record = buildExpectedDnsRecord(mapping);
        if (!record) continue;

        await fetchJson<{ record: CloudflareDnsRecord }>(
          withZoneQuery("/api/admin/cloudflare/dns/records", zoneName),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: findMappingRecordId(mapping), record }),
          },
        );
        syncedCount += 1;
      }

      toast.success(`Synced ${syncedCount} Cloudflare DNS mappings`);
      await loadCloudflare();
    } catch (error) {
      toast.error(errorToMessage(error));
    } finally {
      setMutatingAction(null);
    }
  };

  const handleRedirectRuleSelect = (key: string) => {
    if (key === NEW_REDIRECT_KEY) {
      setRedirectForm({ ...EMPTY_REDIRECT_FORM, selectedRuleKey: NEW_REDIRECT_KEY });
      return;
    }

    const option = redirectRuleOptions.find((item) => item.key === key);
    if (!option) return;
    setRedirectForm(redirectRuleToForm(option.rule, key, EMPTY_REDIRECT_FORM));
  };

  const handleSaveRedirect = async () => {
    if (!redirectForm.expression.trim() || !redirectForm.target.trim()) {
      toast.error("Redirect expression and target are required");
      return;
    }

    setMutatingAction("redirect");
    try {
      const selectedIndex = redirectRuleOptions.findIndex(
        (option) => option.key === redirectForm.selectedRuleKey,
      );
      const existingRule =
        selectedIndex >= 0 ? redirectRuleOptions[selectedIndex]?.rule : undefined;
      const preservedRules =
        redirectRuleset?.rules
          .map((rule, index) => ({
            key: getRedirectRuleKey(rule, index),
            input: redirectRuleToInput(rule),
          }))
          .filter(
            (item): item is { key: string; input: RedirectRuleInput } => item.input !== null,
          ) ?? [];
      const nextRule = redirectFormToInput(redirectForm, existingRule);
      const selectedKey = redirectForm.selectedRuleKey;
      const preservedRuleInputs = preservedRules.map((item) =>
        item.key === selectedKey ? nextRule : item.input,
      );
      const nextRules =
        selectedIndex >= 0 && preservedRules.some((item) => item.key === selectedKey)
          ? preservedRuleInputs
          : [...preservedRuleInputs, nextRule];

      await fetchJson<{ ruleset: CloudflareRuleset }>(
        withZoneQuery("/api/admin/cloudflare/redirects", zoneName),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: redirectRuleset ? "update" : "create",
            ruleset: {
              name: redirectRuleset?.name || "Single Redirect ruleset",
              description: redirectRuleset?.description || "Managed from CRM admin settings.",
              rules: nextRules,
            },
          }),
        },
      );

      toast.success("Redirect ruleset saved");
      setRedirectForm({ ...EMPTY_REDIRECT_FORM });
      await loadCloudflare();
    } catch (error) {
      toast.error(errorToMessage(error));
    } finally {
      setMutatingAction(null);
    }
  };

  const handleEnableEmailRouting = async () => {
    setMutatingAction("email-routing");
    try {
      await fetchJson<{ settings: CloudflareEmailRoutingSettings }>(
        withZoneQuery("/api/admin/cloudflare/email/routing/enable", zoneName),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      toast.success("Cloudflare Email Routing enabled");
      await loadCloudflare();
    } catch (error) {
      toast.error(errorToMessage(error));
    } finally {
      setMutatingAction(null);
    }
  };

  const handleAddDestination = async () => {
    if (!destinationEmail.trim()) {
      toast.error("Destination email is required");
      return;
    }

    setMutatingAction("destination");
    try {
      await fetchJson<{ destination: CloudflareEmailDestinationAddress }>(
        "/api/admin/cloudflare/email/destinations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: destinationEmail.trim() }),
        },
      );
      toast.success("Destination address added");
      setDestinationEmail("");
      await loadCloudflare();
    } catch (error) {
      toast.error(errorToMessage(error));
    } finally {
      setMutatingAction(null);
    }
  };

  const handleAddForwardingAlias = async () => {
    if (!aliasEmail.trim() || !aliasDestinationEmail.trim()) {
      toast.error("Alias and destination are required");
      return;
    }

    setMutatingAction("forwarding-alias");
    try {
      await fetchJson<{ rule: CloudflareEmailRoutingRule }>(
        withZoneQuery("/api/admin/cloudflare/email/rules", zoneName),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Forward ${aliasEmail.trim()}`,
            enabled: true,
            actions: [{ type: "forward", value: [aliasDestinationEmail.trim()] }],
            matchers: [{ type: "literal", field: "to", value: aliasEmail.trim() }],
          }),
        },
      );
      toast.success("Forwarding alias added");
      setAliasEmail("");
      await loadCloudflare();
    } catch (error) {
      toast.error(errorToMessage(error));
    } finally {
      setMutatingAction(null);
    }
  };

  const emailRoutingStatus = status?.emailRouting.ok
    ? status.emailRouting.settings.status
    : "error";
  const emailRoutingEnabled = status?.emailRouting.ok
    ? status.emailRouting.settings.enabled
    : false;

  if (!isHydrated) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <IconBrandCloudflare className="size-5" />
              Cloudflare
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor DNS, redirects, and Email Routing for the selected Cloudflare domain.
            </p>
          </div>
        </div>
        <LoadingRow message="Loading Cloudflare settings..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconBrandCloudflare className="size-5" />
            Cloudflare
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor DNS, redirects, and Email Routing for the selected Cloudflare domain.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadCloudflare}
          disabled={isLoading}
          className="shadow-sm"
        >
          {isLoading ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconRefresh className="size-4" />
          )}
          Refresh
        </Button>
      </div>

      <Alert>
        <IconAlertTriangle className="size-4" />
        <AlertTitle>Webhook bypass hosts are locked</AlertTitle>
        <AlertDescription>
          The hooks and webhooks records must stay DNS-only. Do not orange-cloud them in Cloudflare,
          or Cal.com and other webhook POSTs can be blocked before reaching Railway.
        </AlertDescription>
      </Alert>

      {superAdminWarning && (
        <Alert>
          <IconAlertTriangle className="size-4" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>{superAdminWarning}</AlertDescription>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive">
          <IconCircleX className="size-4" />
          <AlertTitle>Some Cloudflare data could not be loaded</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="space-y-6">
          <Card>
            <HelpedCardHeader
              title="Domain selector"
              description="Select which Cloudflare zone/domain this settings page should inspect and update."
              help={HELP_CONTENT.domainSelector}
            />
            <CardContent className="space-y-4">
              {isLoading && !status ? (
                <LoadingRow message="Loading Cloudflare domains..." />
              ) : status?.zones.ok ? (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
                  <div className="space-y-1.5">
                    <Label htmlFor="cloudflare-zone">Domain</Label>
                    <Select value={zoneName ?? ""} onValueChange={handleZoneSelect}>
                      <SelectTrigger id="cloudflare-zone" className="w-full">
                        <SelectValue placeholder="Select a Cloudflare domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneOptions.map((zone) => (
                          <SelectItem key={zone.name} value={zone.name}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Selected domain
                    </p>
                    <p className="mt-1 break-all text-sm text-foreground">
                      {zoneName ?? "Not selected"}
                    </p>
                  </div>
                </div>
              ) : status?.zones.ok === false ? (
                <Alert variant="destructive">
                  <IconCircleX className="size-4" />
                  <AlertTitle>Domain list failed</AlertTitle>
                  <AlertDescription>{status.zones.error.message}</AlertDescription>
                </Alert>
              ) : (
                <EmptyState message="Cloudflare domains are not available." />
              )}
              <p className="text-xs text-muted-foreground">
                This is a template setting: each new build/client must provide its own Cloudflare
                API token and account values. The selector lists domains available to that
                configured account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Credential and config status"
              description="Environment-backed Cloudflare credentials and zone checks. Secret values are never displayed."
              help={HELP_CONTENT.credentialStatus}
            />
            <CardContent className="space-y-4">
              {isLoading && !status ? (
                <LoadingRow message="Loading Cloudflare status..." />
              ) : status ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldValue
                      label="Overall config"
                      value={status.config.configured ? "Configured" : "Missing required values"}
                    />
                    <FieldValue label="Selected domain" value={zoneName ?? "Not set"} />
                    <FieldValue label="Origin provider" value={origin?.label ?? "Not set"} />
                    <FieldValue label="Origin target" value={originTarget ?? "Not set"} />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Environment variables
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CLOUDFLARE_ENV_VARS.map((name) => (
                        <EnvVarStatus key={name} name={name} isSet={status.config.env[name]} />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {status.credentials.ok ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldValue label="Account" value={status.credentials.data.account.name} />
                      <FieldValue
                        label="Zone"
                        value={`${status.credentials.data.zone.name} (${status.credentials.data.zone.status ?? "unknown"})`}
                      />
                      <FieldValue
                        label="Zone type"
                        value={status.credentials.data.zone.type ?? "Unknown"}
                      />
                      <FieldValue
                        label="Env zone matches Cloudflare"
                        value={formatBoolean(status.credentials.data.zoneNameMatchesEnv)}
                      />
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <IconCircleX className="size-4" />
                      <AlertTitle>Credential check failed</AlertTitle>
                      <AlertDescription>{status.credentials.error.message}</AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <EmptyState message="Cloudflare status is not available." />
              )}
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Domain mapping diagnostics"
              description="Expected apex, www, hooks, and webhooks records for the selected origin provider."
              help={HELP_CONTENT.domainDiagnostics}
            />
            <CardContent className="space-y-4">
              {status ? (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {status.diagnostics.domainMapping.map((mapping) => (
                      <DomainMappingDiagnosticCard key={mapping.key} mapping={mapping} />
                    ))}
                  </div>

                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Sync expected DNS mapping</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Creates or updates apex, www, hooks, and webhooks records for the selected
                        origin provider. Hooks and webhooks are always submitted as DNS-only.
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncDnsMapping}
                      disabled={
                        !isSuperAdmin ||
                        !origin?.isConfigured ||
                        mutatingAction === "dns" ||
                        mutatingAction !== null
                      }
                      className="w-full shadow-sm sm:w-auto"
                    >
                      {mutatingAction === "dns" ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : (
                        <IconRefresh className="size-4" />
                      )}
                      Sync DNS records
                    </Button>
                    {!origin?.isConfigured && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Add CLOUDFLARE_ORIGIN_PROVIDER and CLOUDFLARE_ORIGIN_TARGET before syncing
                        records. Railway can still use CLOUDFLARE_RAILWAY_TARGET as a legacy
                        fallback.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState message="Diagnostics are not available." />
              )}
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="DNS records"
              description="Current records returned by Cloudflare for the selected domain."
              help={HELP_CONTENT.dnsRecords}
            />
            <CardContent className="overflow-x-auto">
              {isLoading && dnsRecords.length === 0 ? (
                <LoadingRow message="Loading DNS records..." />
              ) : dnsRecords.length === 0 ? (
                <EmptyState message="No DNS records found." />
              ) : (
                <Table className="w-max min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-16">Type</TableHead>
                      <TableHead className="min-w-[200px]">Name</TableHead>
                      <TableHead className="min-w-[280px]">Content</TableHead>
                      <TableHead className="min-w-[100px]">Proxy</TableHead>
                      <TableHead className="min-w-16">TTL</TableHead>
                      <TableHead className="min-w-[120px]">Modified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.type}</TableCell>
                        <TableCell className="whitespace-normal break-words align-top">
                          {record.name}
                        </TableCell>
                        <TableCell className="whitespace-normal break-all align-top text-muted-foreground">
                          {record.content}
                        </TableCell>
                        <TableCell className="align-top">
                          {typeof record.proxied === "boolean" ? (
                            <StatusBadge status={record.proxied ? "active" : "info"}>
                              {record.proxied ? "Proxied" : "DNS-only"}
                            </StatusBadge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="align-top">{formatTtl(record.ttl)}</TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {formatDate(record.modified_on)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Redirects"
              description="Single Redirect ruleset for the zone. Saving updates the ruleset only when you press the button."
              help={HELP_CONTENT.redirects}
            />
            <CardContent className="space-y-5">
              {redirectRuleset?.rules && redirectRuleset.rules.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-max min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Description</TableHead>
                        <TableHead className="min-w-[220px]">Expression</TableHead>
                        <TableHead className="min-w-[220px]">Target</TableHead>
                        <TableHead className="min-w-16">Status</TableHead>
                        <TableHead className="min-w-[100px]">Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redirectRuleset.rules.map((rule, index) => (
                        <TableRow key={getRedirectRuleKey(rule, index)}>
                          <TableCell className="whitespace-normal break-words align-top">
                            {rule.description || "—"}
                          </TableCell>
                          <TableCell className="whitespace-normal break-all align-top text-muted-foreground">
                            {rule.expression || "—"}
                          </TableCell>
                          <TableCell className="whitespace-normal break-all align-top text-muted-foreground">
                            {describeRedirectTarget(rule)}
                          </TableCell>
                          <TableCell className="align-top">
                            {rule.action_parameters?.from_value?.status_code ?? "—"}
                          </TableCell>
                          <TableCell className="align-top">
                            <StatusBadge status={rule.enabled ?? true}>
                              {rule.enabled === false ? "Disabled" : "Enabled"}
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="No redirect rules found. Use the form below to create the ruleset." />
              )}

              <Separator />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="redirect-rule">Rule to update</Label>
                  <Select
                    value={redirectForm.selectedRuleKey}
                    onValueChange={handleRedirectRuleSelect}
                  >
                    <SelectTrigger id="redirect-rule" className="w-full">
                      <SelectValue placeholder="Select redirect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEW_REDIRECT_KEY}>Create new redirect</SelectItem>
                      {redirectRuleOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="redirect-status">HTTP status</Label>
                  <Select
                    value={redirectForm.statusCode}
                    onValueChange={(value: `${CloudflareSingleRedirectStatusCode}`) =>
                      setRedirectForm((current) => ({ ...current, statusCode: value }))
                    }
                  >
                    <SelectTrigger id="redirect-status" className="w-full">
                      <SelectValue placeholder="Status code" />
                    </SelectTrigger>
                    <SelectContent>
                      {REDIRECT_STATUS_CODES.map((statusCode) => (
                        <SelectItem key={statusCode} value={`${statusCode}`}>
                          {statusCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor="redirect-expression">Expression</Label>
                  <Input
                    id="redirect-expression"
                    data-lpignore="true"
                    data-form-type="other"
                    autoComplete="off"
                    value={redirectForm.expression}
                    onChange={(event) =>
                      setRedirectForm((current) => ({ ...current, expression: event.target.value }))
                    }
                    placeholder={'http.host eq "www.example.com"'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="redirect-target-mode">Target mode</Label>
                  <Select
                    value={redirectForm.targetMode}
                    onValueChange={(value: RedirectTargetMode) =>
                      setRedirectForm((current) => ({ ...current, targetMode: value }))
                    }
                  >
                    <SelectTrigger id="redirect-target-mode" className="w-full">
                      <SelectValue placeholder="Target mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">Static URL</SelectItem>
                      <SelectItem value="expression">Expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="redirect-target">Target</Label>
                  <Input
                    id="redirect-target"
                    data-lpignore="true"
                    data-form-type="other"
                    autoComplete="off"
                    value={redirectForm.target}
                    onChange={(event) =>
                      setRedirectForm((current) => ({ ...current, target: event.target.value }))
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor="redirect-description">Description</Label>
                  <Input
                    id="redirect-description"
                    data-lpignore="true"
                    data-form-type="other"
                    autoComplete="off"
                    value={redirectForm.description}
                    onChange={(event) =>
                      setRedirectForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="www to apex"
                  />
                </div>
                <div className="flex items-center gap-6 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="redirect-enabled"
                      checked={redirectForm.enabled}
                      onCheckedChange={(checked) =>
                        setRedirectForm((current) => ({ ...current, enabled: checked === true }))
                      }
                    />
                    <Label htmlFor="redirect-enabled" className="text-sm font-medium">
                      Enabled
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="redirect-preserve-query-string"
                      checked={redirectForm.preserveQueryString}
                      onCheckedChange={(checked) =>
                        setRedirectForm((current) => ({
                          ...current,
                          preserveQueryString: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor="redirect-preserve-query-string" className="text-sm font-medium">
                      Preserve query string
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveRedirect}
                disabled={
                  !isSuperAdmin ||
                  !redirectForm.expression ||
                  !redirectForm.target ||
                  mutatingAction === "redirect" ||
                  mutatingAction !== null
                }
                className="shadow-sm"
              >
                {mutatingAction === "redirect" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconRoute className="size-4" />
                )}
                Add/update redirect
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <HelpedCardHeader
              title="Email Routing status"
              description="Cloudflare Email Routing settings for inbound aliases."
              help={HELP_CONTENT.emailRoutingStatus}
            />
            <CardContent className="space-y-4">
              {status?.emailRouting.ok ? (
                <div className="space-y-3">
                  <LabeledStatusRow label="Enabled" status={emailRoutingEnabled}>
                    {emailRoutingEnabled ? "Enabled" : "Disabled"}
                  </LabeledStatusRow>
                  <LabeledStatusRow label="Status" status={emailRoutingStatus ?? "unknown"}>
                    {emailRoutingStatus ?? "unknown"}
                  </LabeledStatusRow>
                  <FieldValue label="Routing name" value={status.emailRouting.settings.name} />
                </div>
              ) : status?.emailRouting.ok === false ? (
                <Alert variant="destructive">
                  <IconCircleX className="size-4" />
                  <AlertTitle>Email Routing check failed</AlertTitle>
                  <AlertDescription>{status.emailRouting.error.message}</AlertDescription>
                </Alert>
              ) : (
                <LoadingRow message="Loading Email Routing status..." />
              )}

              <Button
                onClick={handleEnableEmailRouting}
                disabled={
                  !isSuperAdmin ||
                  emailRoutingEnabled ||
                  mutatingAction === "email-routing" ||
                  mutatingAction !== null
                }
                className="w-full shadow-sm"
              >
                {mutatingAction === "email-routing" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconCheck className="size-4" />
                )}
                Enable email routing
              </Button>
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Destination addresses"
              description="Verified inboxes that Cloudflare can forward mail to."
              help={HELP_CONTENT.destinationAddresses}
            />
            <CardContent className="space-y-4">
              <Alert>
                <IconAlertTriangle className="size-4" />
                <AlertTitle>Verification may be required</AlertTitle>
                <AlertDescription>
                  Cloudflare can require the destination mailbox owner to confirm a verification
                  email before forwarding works.
                </AlertDescription>
              </Alert>

              {destinations.length === 0 ? (
                <EmptyState message="No destination addresses found." />
              ) : (
                <div className="space-y-2">
                  {destinations.map((destination) => (
                    <div
                      key={destination.id ?? destination.email}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium">
                          {destination.email ?? "Unknown email"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(destination.created)}
                        </p>
                      </div>
                      <StatusBadge status={destination.verified ? "active" : "pending"}>
                        {destination.verified ? "Verified" : "Pending"}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="destination-email">Add destination address</Label>
                <Input
                  id="destination-email"
                  type="email"
                  data-lpignore="true"
                  data-form-type="other"
                  autoComplete="off"
                  value={destinationEmail}
                  onChange={(event) => setDestinationEmail(event.target.value)}
                  placeholder="ops@example.com"
                />
                <Button
                  onClick={handleAddDestination}
                  disabled={
                    !isSuperAdmin ||
                    !destinationEmail ||
                    mutatingAction === "destination" ||
                    mutatingAction !== null
                  }
                  className="w-full shadow-sm"
                >
                  {mutatingAction === "destination" ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconMailPlus className="size-4" />
                  )}
                  Add destination address
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Forwarding aliases"
              description="Inbound addresses and the destinations they forward to."
              help={HELP_CONTENT.forwardingAliases}
            />
            <CardContent className="space-y-4">
              {emailRules.length === 0 ? (
                <EmptyState message="No forwarding aliases found." />
              ) : (
                <div className="space-y-2">
                  {emailRules.map((rule, index) => (
                    <div
                      key={rule.id ?? rule.tag ?? index}
                      className="min-w-0 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="break-all text-sm font-medium">
                            {rule.name || describeMatchers(rule.matchers)}
                          </p>
                          <p className="break-all text-xs leading-relaxed text-muted-foreground">
                            To: {describeMatchers(rule.matchers)}
                          </p>
                          <p className="break-all text-xs leading-relaxed text-muted-foreground">
                            Forward: {describeForwardingActions(rule.actions)}
                          </p>
                        </div>
                        <StatusBadge status={rule.enabled ?? true}>
                          {rule.enabled === false ? "Disabled" : "Enabled"}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="alias-email">Alias address</Label>
                  <Input
                    id="alias-email"
                    type="email"
                    data-lpignore="true"
                    data-form-type="other"
                    autoComplete="off"
                    value={aliasEmail}
                    onChange={(event) => setAliasEmail(event.target.value)}
                    placeholder={`hello@${zoneName ?? "example.com"}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alias-destination-email">Forward to</Label>
                  <Input
                    id="alias-destination-email"
                    type="email"
                    data-lpignore="true"
                    data-form-type="other"
                    autoComplete="off"
                    value={aliasDestinationEmail}
                    onChange={(event) => setAliasDestinationEmail(event.target.value)}
                    placeholder={getFirstDestinationEmail(destinations)}
                  />
                </div>
                <Button
                  onClick={handleAddForwardingAlias}
                  disabled={
                    !isSuperAdmin ||
                    !aliasEmail ||
                    !aliasDestinationEmail ||
                    mutatingAction === "forwarding-alias" ||
                    mutatingAction !== null
                  }
                  className="w-full shadow-sm"
                >
                  {mutatingAction === "forwarding-alias" ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconMailForward className="size-4" />
                  )}
                  Add forwarding alias
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <HelpedCardHeader
              title="Railway verification TXT"
              description="TXT records Cloudflare diagnostics flagged as Railway verification."
              help={HELP_CONTENT.railwayVerification}
            />
            <CardContent>
              {status?.diagnostics.railwayVerificationTxtRecords.length ? (
                <div className="space-y-2">
                  {status.diagnostics.railwayVerificationTxtRecords.map((record) => (
                    <div key={record.id} className="min-w-0 rounded-lg border bg-muted/20 p-3">
                      <p className="break-all text-sm font-medium">{record.name}</p>
                      <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                        {record.content}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Modified {formatDate(record.modifiedOn)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No Railway verification TXT records found." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
