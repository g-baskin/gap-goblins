import type { NextRequest } from "next/server";
import {
  createCloudflareSingleRedirectRuleset,
  readCloudflareSingleRedirectRuleset,
  updateCloudflareSingleRedirectRuleset,
} from "@/lib/cloudflare/client";
import {
  cloudflareDataResponse,
  cloudflareFailureResponse,
  parseJsonBody,
  parseSearchParams,
  requireCloudflareAdmin,
  toPublicCloudflareMeta,
} from "../_lib/route-helpers";
import { cloudflareZoneQuerySchema, redirectRulesetMutationSchema } from "../_lib/schemas";

export async function GET(request: NextRequest) {
  const authResult = await requireCloudflareAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = parseSearchParams(request, cloudflareZoneQuerySchema);
  if (!parsed.ok) return parsed.response;

  const result = await readCloudflareSingleRedirectRuleset(parsed.data);
  return cloudflareDataResponse("ruleset", result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireCloudflareAdmin({ mutation: true });
  if (!authResult.ok) return authResult.response;

  const urlParsed = parseSearchParams(request, cloudflareZoneQuerySchema);
  if (!urlParsed.ok) return urlParsed.response;

  const parsed = await parseJsonBody(request, redirectRulesetMutationSchema);
  if (!parsed.ok) return parsed.response;

  const result =
    parsed.data.mode === "create"
      ? await createCloudflareSingleRedirectRuleset(parsed.data.ruleset, urlParsed.data)
      : await updateCloudflareSingleRedirectRuleset(parsed.data.ruleset, urlParsed.data);

  if (!result.ok) {
    return cloudflareFailureResponse(result, "Failed to save Cloudflare redirect ruleset");
  }

  return Response.json({
    ruleset: result.data,
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
