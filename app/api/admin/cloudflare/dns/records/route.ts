import type { NextRequest } from "next/server";
import {
  createCloudflareDnsRecord,
  listCloudflareDnsRecords,
  updateCloudflareDnsRecord,
} from "@/lib/cloudflare/client";
import type { CloudflareDnsRecordInput } from "@/lib/cloudflare/types";
import {
  cloudflareDataResponse,
  cloudflareFailureResponse,
  parseJsonBody,
  parseSearchParams,
  requireCloudflareAdmin,
  toPublicCloudflareMeta,
} from "../../_lib/route-helpers";
import { dnsRecordMutationSchema, dnsRecordsQuerySchema } from "../../_lib/schemas";

export async function GET(request: NextRequest) {
  const authResult = await requireCloudflareAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = parseSearchParams(request, dnsRecordsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { zoneName, ...filters } = parsed.data;
  const result = await listCloudflareDnsRecords(filters, { zoneName });
  return cloudflareDataResponse("records", result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireCloudflareAdmin({ mutation: true });
  if (!authResult.ok) return authResult.response;

  const parsed = await parseJsonBody(request, dnsRecordMutationSchema);
  if (!parsed.ok) return parsed.response;

  const urlParsed = parseSearchParams(request, dnsRecordsQuerySchema.pick({ zoneName: true }));
  if (!urlParsed.ok) return urlParsed.response;

  const record = parsed.data.record as CloudflareDnsRecordInput;
  const result = parsed.data.id
    ? await updateCloudflareDnsRecord(parsed.data.id, record, urlParsed.data)
    : await createCloudflareDnsRecord(record, urlParsed.data);

  if (!result.ok) {
    return cloudflareFailureResponse(result, "Failed to save Cloudflare DNS record");
  }

  return Response.json({
    record: result.data,
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
