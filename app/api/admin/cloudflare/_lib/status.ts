import {
  getCloudflareConfigStatus,
  getCloudflareCredentialStatus,
  listCloudflareDnsRecords,
  listCloudflareZoneSummaries,
  readCloudflareEmailRoutingStatus,
} from "@/lib/cloudflare/client";
import type { CloudflareCredentialStatus } from "@/lib/cloudflare/types";
import { buildCloudflareDiagnostics } from "./diagnostics";
import { toPublicCloudflareError, toPublicCloudflareMeta } from "./route-helpers";

function toPublicCredentialStatus(status: CloudflareCredentialStatus) {
  return {
    account: {
      name: status.account.name,
      type: status.account.type,
    },
    zone: {
      name: status.zone.name,
      status: status.zone.status,
      type: status.zone.type,
      accountName: status.zone.accountName,
    },
    zoneNameMatchesEnv: status.zoneNameMatchesEnv,
  };
}

export async function buildCloudflareStatusPayload(options?: { zoneName?: string }) {
  const zonesResult = await listCloudflareZoneSummaries();
  const initialConfig = getCloudflareConfigStatus(options);
  const effectiveZoneName =
    options?.zoneName ??
    initialConfig.zoneName ??
    (zonesResult.ok ? zonesResult.data[0]?.name : undefined);
  const zoneOptions = effectiveZoneName ? { zoneName: effectiveZoneName } : undefined;
  const config = getCloudflareConfigStatus(zoneOptions);

  const [credentialResult, dnsResult, emailRoutingResult] = await Promise.all([
    getCloudflareCredentialStatus(zoneOptions),
    listCloudflareDnsRecords({ perPage: 100 }, zoneOptions),
    readCloudflareEmailRoutingStatus(zoneOptions),
  ]);

  const selectedZoneName = credentialResult.ok
    ? credentialResult.data.zone.name
    : config.selectedZoneName;
  const diagnostics = buildCloudflareDiagnostics({
    records: dnsResult.ok ? dnsResult.data : [],
    zoneName: selectedZoneName,
    origin: config.origin,
    railwayTarget: config.railwayTarget,
  });

  return {
    config,
    zones: zonesResult.ok
      ? {
          ok: true,
          domains: zonesResult.data,
          messages: zonesResult.messages,
          meta: toPublicCloudflareMeta(zonesResult.meta),
        }
      : {
          ok: false,
          domains: [],
          error: toPublicCloudflareError(zonesResult.error),
          meta: toPublicCloudflareMeta(zonesResult.meta),
        },
    credentials: credentialResult.ok
      ? {
          ok: true,
          data: toPublicCredentialStatus(credentialResult.data),
          messages: credentialResult.messages,
          meta: toPublicCloudflareMeta(credentialResult.meta),
        }
      : {
          ok: false,
          error: toPublicCloudflareError(credentialResult.error),
          meta: toPublicCloudflareMeta(credentialResult.meta),
        },
    emailRouting: emailRoutingResult.ok
      ? {
          ok: true,
          settings: emailRoutingResult.data,
          messages: emailRoutingResult.messages,
          meta: toPublicCloudflareMeta(emailRoutingResult.meta),
        }
      : {
          ok: false,
          error: toPublicCloudflareError(emailRoutingResult.error),
          meta: toPublicCloudflareMeta(emailRoutingResult.meta),
        },
    diagnostics,
    dnsMeta: toPublicCloudflareMeta(dnsResult.meta),
    dnsError: dnsResult.ok ? null : toPublicCloudflareError(dnsResult.error),
  };
}
