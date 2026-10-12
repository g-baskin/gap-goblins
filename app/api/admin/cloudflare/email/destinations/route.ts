import type { NextRequest } from "next/server";
import {
  createCloudflareEmailDestinationAddress,
  listCloudflareEmailDestinationAddresses,
} from "@/lib/cloudflare/client";
import {
  cloudflareDataResponse,
  cloudflareFailureResponse,
  parseJsonBody,
  parseSearchParams,
  requireCloudflareAdmin,
  toPublicCloudflareMeta,
} from "../../_lib/route-helpers";
import { emailDestinationMutationSchema, emailDestinationsQuerySchema } from "../../_lib/schemas";

export async function GET(request: NextRequest) {
  const authResult = await requireCloudflareAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = parseSearchParams(request, emailDestinationsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const result = await listCloudflareEmailDestinationAddresses(parsed.data);
  return cloudflareDataResponse("destinations", result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireCloudflareAdmin({ mutation: true });
  if (!authResult.ok) return authResult.response;

  const parsed = await parseJsonBody(request, emailDestinationMutationSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createCloudflareEmailDestinationAddress(parsed.data.email);

  if (!result.ok) {
    return cloudflareFailureResponse(result, "Failed to create Cloudflare email destination");
  }

  return Response.json({
    destination: result.data,
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
