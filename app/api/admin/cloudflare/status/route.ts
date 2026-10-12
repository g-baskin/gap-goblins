import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseSearchParams, requireCloudflareAdmin } from "../_lib/route-helpers";
import { cloudflareZoneQuerySchema } from "../_lib/schemas";
import { buildCloudflareStatusPayload } from "../_lib/status";

export async function GET(request: NextRequest) {
  const authResult = await requireCloudflareAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = parseSearchParams(request, cloudflareZoneQuerySchema);
  if (!parsed.ok) return parsed.response;

  return NextResponse.json(await buildCloudflareStatusPayload(parsed.data));
}
