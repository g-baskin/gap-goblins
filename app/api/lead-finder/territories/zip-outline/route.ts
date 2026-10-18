import { fetchZipOutline } from "@/lib/lead-finder/territories/census";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireLeadFinderTenant } from "../../_lib";
import { CENSUS_RATE_LIMIT } from "../_shared";

/** Census outline for one ZIP, so the editor can preview it on the map before saving. */
export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const zip = new URL(request.url).searchParams.get("zip") ?? "";
  if (!/^\d{5}$/.test(zip)) {
    return Response.json({ error: "ZIP codes must be 5 digits" }, { status: 400 });
  }
  const limited = await checkRateLimit(
    `lead-territory:${authResult.userId}`,
    CENSUS_RATE_LIMIT,
    "api",
  );
  if (!limited.success) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  const result = await fetchZipOutline(zip, { signal: request.signal });
  if (result.ok) return Response.json({ outline: result.value });
  if (result.error === "not_found") {
    return Response.json(
      { error: `The Census has no area for ZIP ${zip} (it may be a PO-box-only ZIP)` },
      { status: 404 },
    );
  }
  return Response.json(
    { error: "The Census ZIP map service is unavailable right now. Try again shortly." },
    { status: 502 },
  );
}
