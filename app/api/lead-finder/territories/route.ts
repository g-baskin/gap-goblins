import { db } from "@/lib/db";
import { resolveZipOutlines } from "@/lib/lead-finder/territories/service";
import { listTerritories, saveTerritory } from "@/lib/lead-finder/territories/store";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireLeadFinderTenant } from "../_lib";
import { CENSUS_RATE_LIMIT, territoryBodySchema, validationError } from "./_shared";

export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const territories = await listTerritories(db, authResult.tenant.tenantId);
  return Response.json({ territories });
}

export async function POST(request: Request) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
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

  const zips = await resolveZipOutlines(parsed.data.zipCodes, [], { signal: request.signal });
  if (!zips.ok) return Response.json({ error: zips.error }, { status: zips.status });

  const saved = await saveTerritory(
    db,
    authResult.tenant.tenantId,
    { name: parsed.data.name, polygons: parsed.data.polygons, zips: zips.zips },
    { createdBy: authResult.userId },
  );
  if (!saved.ok) return Response.json({ error: saved.error }, { status: saved.status });
  return Response.json({ territory: saved.territory }, { status: 201 });
}
