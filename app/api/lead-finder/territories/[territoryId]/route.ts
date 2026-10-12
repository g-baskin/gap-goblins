import { db } from "@/lib/db";
import { resolveZipOutlines } from "@/lib/lead-finder/territories/service";
import { deleteTerritory, getTerritory, saveTerritory } from "@/lib/lead-finder/territories/store";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUuid, notFound, requireLeadFinderTenant } from "../../_lib";
import { CENSUS_RATE_LIMIT, territoryBodySchema, validationError } from "../_shared";

type Params = { params: Promise<{ territoryId: string }> };

export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { territoryId } = await params;
  if (!isUuid(territoryId)) return notFound("Territory not found");
  const territory = await getTerritory(db, authResult.tenant.tenantId, territoryId);
  if (!territory) return notFound("Territory not found");
  return Response.json({ territory });
}

export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
  const { territoryId } = await params;
  if (!isUuid(territoryId)) return notFound("Territory not found");
  const tenantId = authResult.tenant.tenantId;
  const limited = await checkRateLimit(
    `lead-territory:${authResult.userId}`,
    CENSUS_RATE_LIMIT,
    "api",
  );
  if (!limited.success) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = territoryBodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const existing = await getTerritory(db, tenantId, territoryId);
  if (!existing) return notFound("Territory not found");
  const zips = await resolveZipOutlines(parsed.data.zipCodes, existing.zips, {
    signal: request.signal,
  });
  if (!zips.ok) return Response.json({ error: zips.error }, { status: zips.status });

  const saved = await saveTerritory(
    db,
    tenantId,
    { name: parsed.data.name, polygons: parsed.data.polygons, zips: zips.zips },
    { territoryId },
  );
  if (!saved.ok) return Response.json({ error: saved.error }, { status: saved.status });
  return Response.json({ territory: saved.territory });
}

export async function DELETE(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
  const { territoryId } = await params;
  if (!isUuid(territoryId)) return notFound("Territory not found");
  const deleted = await deleteTerritory(db, authResult.tenant.tenantId, territoryId);
  if (!deleted) return notFound("Territory not found");
  return Response.json({ ok: true });
}
