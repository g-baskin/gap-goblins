/**
 * Builds a territory's ZIP outlines on the server. Clients send ZIP codes only; outlines always
 * come from the Census (or, for ZIPs the territory already had, from the stored copy), so a
 * client can never store a made-up ZIP shape.
 */
import { type CensusOptions, type CensusResult, fetchZipOutline } from "./census";
import type { TerritoryZip } from "./types";

export type ZipOutlineLookup = (
  zip: string,
  options?: CensusOptions,
) => Promise<CensusResult<TerritoryZip>>;

export type ResolveZipsResult =
  | { ok: true; zips: TerritoryZip[] }
  | { ok: false; error: string; status: 400 | 502 };

/** Most new ZIP outlines fetched for one save, to keep a save quick and the Census load light. */
export const NEW_ZIPS_PER_SAVE = 40;

export async function resolveZipOutlines(
  zipCodes: readonly string[],
  existing: readonly TerritoryZip[],
  options: { lookup?: ZipOutlineLookup; signal?: AbortSignal } = {},
): Promise<ResolveZipsResult> {
  const lookup = options.lookup ?? fetchZipOutline;
  const known = new Map(existing.map((zip) => [zip.zip, zip]));
  const missing = zipCodes.filter((zip) => !known.has(zip));
  if (missing.length > NEW_ZIPS_PER_SAVE) {
    return {
      ok: false,
      status: 400,
      error: `Add at most ${NEW_ZIPS_PER_SAVE} new ZIP codes at a time`,
    };
  }
  const fetched = new Map<string, TerritoryZip>();
  const notFound: string[] = [];
  // Sequential on purpose: a handful of quick requests, and polite to a free public service.
  for (const zip of missing) {
    const result = await lookup(zip, { signal: options.signal });
    if (result.ok) {
      fetched.set(zip, result.value);
    } else if (result.error === "not_found" || result.error === "invalid") {
      notFound.push(zip);
    } else {
      return {
        ok: false,
        status: 502,
        error: "The Census ZIP map service is unavailable right now. Try again shortly.",
      };
    }
  }
  if (notFound.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `The Census has no area for ZIP ${notFound.join(", ")} (it may be a PO-box-only ZIP)`,
    };
  }
  const zips: TerritoryZip[] = [];
  for (const zip of zipCodes) {
    const outline = known.get(zip) ?? fetched.get(zip);
    if (outline) zips.push(outline);
  }
  return { ok: true, zips };
}
