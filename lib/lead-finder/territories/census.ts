/**
 * U.S. Census Bureau lookups for territories: ZIP code outlines (TIGERweb ZCTA layer) and
 * address → map point (Census Geocoder). Both are free, keyless public services.
 *
 * Contract verified live on 2026-10-12: TIGERweb returned the 22401 ZCTA as a GeoJSON Polygon
 * with `properties.ZCTA5`; the geocoder returned `result.addressMatches[0].coordinates {x, y}`
 * and `addressComponents.zip`. Endpoints adapted from PawOs2 geo-lookup.ts @ b78f88e.
 *
 * Server-side only (web routes and the worker). Hosts are fixed constants, user input only ever
 * goes into encoded query values, responses are size- and time-bounded, redirects are refused.
 */
import type { GeoPoint, GeoPolygon, TerritoryZip } from "./types";
import { TERRITORY_LIMITS } from "./types";

const ZCTA_QUERY =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query";
const GEOCODER = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
export const ZCTA_SOURCE = "U.S. Census Bureau TIGERweb 2020 ZCTA";
const RESPONSE_LIMIT = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT = "GapGoblins/0 (lead territories)";

export type CensusFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface CensusOptions {
  fetcher?: CensusFetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type CensusResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "not_found" | "unavailable" | "invalid" };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** GETs JSON from a fixed Census URL with a time and size limit. Never throws. */
async function getJson(url: string, options: CensusOptions): Promise<CensusResult<unknown>> {
  const fetcher = options.fetcher ?? fetch;
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetcher(url, {
      signal,
      redirect: "error",
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }
  if (!response.ok) return { ok: false, error: "unavailable" };
  if (Number(response.headers.get("content-length") ?? "0") > RESPONSE_LIMIT) {
    return { ok: false, error: "unavailable" };
  }
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, error: "unavailable" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > RESPONSE_LIMIT) {
        await reader.cancel();
        return { ok: false, error: "unavailable" };
      }
      chunks.push(part.value);
    }
  } catch {
    return { ok: false, error: "unavailable" };
  } finally {
    reader.releaseLock();
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

const round = (value: number) => Math.round(value * 1e5) / 1e5;

/** One GeoJSON ring as rounded points without the repeated closing corner, or null if malformed. */
function ring(value: unknown): GeoPoint[] | null {
  if (!Array.isArray(value)) return null;
  const points: GeoPoint[] = [];
  for (const point of value) {
    if (!Array.isArray(point)) return null;
    const [lng, lat] = point as unknown[];
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return null;
    }
    points.push({ lat: round(lat), lng: round(lng) });
  }
  const first = points[0];
  const last = points.at(-1);
  if (first && last && points.length > 1 && first.lat === last.lat && first.lng === last.lng) {
    points.pop();
  }
  return points;
}

/**
 * Converts the TIGERweb GeoJSON for one ZIP into polygons, or null when the shape is malformed
 * or still too detailed (the caller then asks for a simpler outline).
 */
export function zctaPolygons(body: unknown, zip: string): GeoPolygon[] | null {
  if (!record(body) || !Array.isArray(body.features)) return null;
  const feature = body.features.find(
    (item: unknown) => record(item) && record(item.properties) && item.properties.ZCTA5 === zip,
  );
  if (!record(feature) || !record(feature.geometry)) return null;
  const { type, coordinates } = feature.geometry;
  const shapes: unknown[] =
    type === "Polygon"
      ? [coordinates]
      : type === "MultiPolygon" && Array.isArray(coordinates)
        ? coordinates
        : [];
  const polygons: GeoPolygon[] = [];
  for (const shape of shapes) {
    if (!Array.isArray(shape)) return null;
    const rings = shape.map(ring);
    if (rings.some((r) => r === null)) return null;
    const [outer, ...holes] = rings as GeoPoint[][];
    if (!outer || outer.length < 3) continue;
    polygons.push({ outer, holes: holes.filter((hole) => hole.length >= 3) });
  }
  const tooDetailed = polygons.some(
    (polygon) =>
      polygon.outer.length > TERRITORY_LIMITS.cornersPerRing ||
      polygon.holes.some((hole) => hole.length > TERRITORY_LIMITS.cornersPerRing),
  );
  if (polygons.length === 0 || tooDetailed) return null;
  return polygons;
}

/**
 * Fetches a ZIP's Census outline. not_found when the Census has no such ZIP area (for example a
 * PO-box-only ZIP). Retries with a coarser outline when the detailed one is too large.
 */
export async function fetchZipOutline(
  zip: string,
  options: CensusOptions = {},
): Promise<CensusResult<TerritoryZip>> {
  if (!/^\d{5}$/.test(zip)) return { ok: false, error: "invalid" };
  for (const offset of ["0.0005", "0.001", "0.002", "0.004", "0.008"]) {
    const params = new URLSearchParams({
      f: "geojson",
      where: `ZCTA5='${zip}'`,
      outFields: "ZCTA5",
      returnGeometry: "true",
      outSR: "4326",
      geometryPrecision: "5",
      maxAllowableOffset: offset,
    });
    const body = await getJson(`${ZCTA_QUERY}?${params}`, options);
    if (!body.ok) return body;
    if (!record(body.value) || !Array.isArray(body.value.features)) {
      return { ok: false, error: "unavailable" };
    }
    if (body.value.features.length === 0) return { ok: false, error: "not_found" };
    const polygons = zctaPolygons(body.value, zip);
    if (polygons) return { ok: true, value: { zip, source: ZCTA_SOURCE, polygons } };
  }
  return { ok: false, error: "unavailable" };
}

export interface GeocodeMatch {
  point: GeoPoint;
  postalCode: string | null;
}

/** Parses a Census Geocoder response into the first match, or null when there is none. */
export function geocoderMatch(body: unknown): GeocodeMatch | null | undefined {
  if (!record(body) || !record(body.result) || !Array.isArray(body.result.addressMatches)) {
    return undefined;
  }
  const match = body.result.addressMatches[0];
  if (!record(match)) return null;
  const coords = record(match.coordinates) ? match.coordinates : null;
  const lng = coords?.x;
  const lat = coords?.y;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return undefined;
  }
  const zip = record(match.addressComponents) ? match.addressComponents.zip : null;
  return {
    point: { lat: round(lat), lng: round(lng) },
    postalCode: typeof zip === "string" && /^\d{5}$/.test(zip) ? zip : null,
  };
}

/** Looks up a US street address. not_found when the Census has no match. */
export async function geocodeAddress(
  address: string,
  options: CensusOptions = {},
): Promise<CensusResult<GeocodeMatch>> {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strips control characters from scraped text
  const clean = address.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (clean.length < 5 || clean.length > 300) return { ok: false, error: "invalid" };
  const params = new URLSearchParams({
    address: clean,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const body = await getJson(`${GEOCODER}?${params}`, options);
  if (!body.ok) return body;
  const match = geocoderMatch(body.value);
  if (match === undefined) return { ok: false, error: "unavailable" };
  if (match === null) return { ok: false, error: "not_found" };
  return { ok: true, value: match };
}
