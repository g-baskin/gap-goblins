import type { NextRequest } from "next/server";
import {
  createCloudflareEmailRoutingRule,
  listCloudflareEmailRoutingRules,
} from "@/lib/cloudflare/client";
import type { CloudflareEmailRoutingRuleInput } from "@/lib/cloudflare/types";
import {
  cloudflareDataResponse,
  cloudflareFailureResponse,
  parseJsonBody,
  parseSearchParams,
  requireCloudflareAdmin,
  toPublicCloudflareMeta,
} from "../../_lib/route-helpers";
import { emailRoutingRuleMutationSchema, emailRoutingRulesQuerySchema } from "../../_lib/schemas";

export async function GET(request: NextRequest) {
  const authResult = await requireCloudflareAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = parseSearchParams(request, emailRoutingRulesQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { zoneName, ...filters } = parsed.data;
  const result = await listCloudflareEmailRoutingRules(filters, { zoneName });
  return cloudflareDataResponse("rules", result);
}

export async function POST(request: NextRequest) {
  const authResult = await requireCloudflareAdmin({ mutation: true });
  if (!authResult.ok) return authResult.response;

  const urlParsed = parseSearchParams(
    request,
    emailRoutingRulesQuerySchema.pick({ zoneName: true }),
  );
  if (!urlParsed.ok) return urlParsed.response;

  const parsed = await parseJsonBody(request, emailRoutingRuleMutationSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createCloudflareEmailRoutingRule(
    parsed.data as CloudflareEmailRoutingRuleInput,
    urlParsed.data,
  );

  if (!result.ok) {
    return cloudflareFailureResponse(result, "Failed to create Cloudflare email routing rule");
  }

  return Response.json({
    rule: result.data,
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
