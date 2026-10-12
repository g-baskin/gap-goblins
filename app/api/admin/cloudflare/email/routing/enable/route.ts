import type { NextRequest } from "next/server";
import { enableCloudflareEmailRouting } from "@/lib/cloudflare/client";
import {
  cloudflareFailureResponse,
  parseJsonBody,
  parseSearchParams,
  requireCloudflareAdmin,
  toPublicCloudflareMeta,
} from "../../../_lib/route-helpers";
import { cloudflareZoneQuerySchema, enableEmailRoutingMutationSchema } from "../../../_lib/schemas";

export async function POST(request: NextRequest) {
  const authResult = await requireCloudflareAdmin({ mutation: true });
  if (!authResult.ok) return authResult.response;

  const urlParsed = parseSearchParams(request, cloudflareZoneQuerySchema);
  if (!urlParsed.ok) return urlParsed.response;

  const parsed = await parseJsonBody(request, enableEmailRoutingMutationSchema);
  if (!parsed.ok) return parsed.response;

  const result = await enableCloudflareEmailRouting(urlParsed.data);

  if (!result.ok) {
    return cloudflareFailureResponse(result, "Failed to enable Cloudflare email routing");
  }

  return Response.json({
    settings: result.data,
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
