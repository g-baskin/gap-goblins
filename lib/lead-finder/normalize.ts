/**
 * Maps source records (omkar Google Maps Extractor exports/API results and
 * generic CSVs) to NormalizedBusiness.
 *
 * Header matching ignores case, spaces, underscores and dashes, so
 * "MAIN_CATEGORY", "main_category" and "Main Category" are the same column.
 * Field names follow omkarcloud/google-maps-scraper fields.md (MIT, docs only):
 * https://github.com/omkarcloud/google-maps-scraper/blob/master/fields.md
 *
 * Missing column → null (unknown). Present column with an empty cell → the
 * field's "none" value where that is unambiguous (no website, no description,
 * no hours, zero owner posts); otherwise null.
 */

import { toUsE164 } from "./phone";
import {
  parseCoordinates,
  parsePostalCode,
  pointFrom,
  postalCodeFromAddress,
  postalCodeFromDetailedAddress,
} from "./territories/location";
import type { NormalizedBusiness, Tri } from "./types";

export type FieldKey =
  | "kgmid"
  | "placeId"
  | "cid"
  | "name"
  | "mainCategory"
  | "address"
  | "phone"
  | "website"
  | "gbpUrl"
  | "rating"
  | "reviewCount"
  | "imageCount"
  | "canClaim"
  | "description"
  | "hours"
  | "ownerPosts"
  | "isPermanentlyClosed"
  | "isTemporarilyClosed"
  | "email"
  | "coordinates"
  | "latitude"
  | "longitude"
  | "postalCode"
  | "detailedAddress";

/** Column aliases per field, normalised (lowercase, alphanumerics only). */
export const COLUMN_ALIASES: Record<FieldKey, string[]> = {
  kgmid: ["kgmid", "knowledgegraphid"],
  placeId: ["placeid", "googleplaceid"],
  cid: ["cid", "googlecid"],
  name: ["name", "businessname", "title", "company", "companyname"],
  mainCategory: ["maincategory", "category", "categories", "type", "businesstype"],
  address: ["address", "fulladdress", "streetaddress"],
  phone: ["phone", "phonenumber", "telephone", "internationalphonenumber"],
  website: ["website", "websiteurl", "site", "url"],
  gbpUrl: ["link", "googlemapsurl", "mapsurl", "gbpurl", "googlemapslink", "placeurl"],
  rating: ["rating", "averagerating", "stars"],
  reviewCount: ["reviews", "reviewcount", "reviewscount", "numberofreviews", "totalreviews"],
  imageCount: ["imagecount", "images", "photos", "photocount", "photoscount"],
  canClaim: ["canclaim", "claimable", "isclaimable"],
  description: ["description", "about"],
  hours: ["hours", "openinghours", "workhours", "workdaytiming"],
  ownerPosts: ["ownerposts", "ownerpostscount", "posts"],
  isPermanentlyClosed: ["ispermanentlyclosed", "permanentlyclosed"],
  isTemporarilyClosed: ["istemporarilyclosed", "temporarilyclosed"],
  email: ["email", "emails", "emailaddress"],
  coordinates: ["coordinates", "coords", "latlng", "location"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon", "long"],
  postalCode: ["postalcode", "zip", "zipcode", "postcode"],
  detailedAddress: ["detailedaddress"],
};

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Resolves which source column feeds each field. First alias match wins. */
export function resolveColumns(headers: string[]): Partial<Record<FieldKey, string>> {
  const byNormalized = new Map<string, string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (key && !byNormalized.has(key)) byNormalized.set(key, header);
  }
  const mapping: Partial<Record<FieldKey, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as FieldKey[]) {
    for (const alias of COLUMN_ALIASES[field]) {
      const header = byNormalized.get(alias);
      if (header !== undefined) {
        mapping[field] = header;
        break;
      }
    }
  }
  return mapping;
}

/** Looks like omkar's export: it has the KGMID column (always present in omkar data). */
export function isOmkarExport(headers: string[]): boolean {
  return headers.some((h) => normalizeHeader(h) === "kgmid");
}

const TRUE_WORDS = new Set(["true", "yes", "y", "1", "t"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0", "f"]);

export function parseBool(value: unknown): Tri {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (TRUE_WORDS.has(v)) return true;
  if (FALSE_WORDS.has(v)) return false;
  return null;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseCount(value: unknown): number | null {
  const n = parseNumber(value);
  if (n === null || n < 0) return null;
  return Math.floor(n);
}

function isEmptyStructured(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  if (typeof value === "string") {
    const v = value.trim();
    return v === "" || v === "[]" || v === "{}" || v.toLowerCase() === "null";
  }
  return false;
}

/** Present column: empty → false, anything else → true. */
function presence(value: unknown): boolean {
  return !isEmptyStructured(value);
}

function countOwnerPosts(value: unknown): number | null {
  if (isEmptyStructured(value)) return 0;
  if (Array.isArray(value)) return value.length;
  const asNumber = parseCount(value);
  if (asNumber !== null) return asNumber;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {
      // Not JSON: non-empty text means at least one post we can't count exactly.
    }
    return 1;
  }
  return null;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const v = (typeof value === "string" ? value : String(value)).trim();
  return v === "" ? null : v;
}

function firstEmail(value: unknown): string | null {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const match = v.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[a-z]{2,}/i);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/** Caps the stored raw payload: long strings are truncated, the whole is ≤ maxBytes. */
export function capRawPayload(
  record: Record<string, unknown>,
  maxBytes = 16 * 1024,
): Record<string, unknown> {
  const capped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.length > 2000) {
      capped[key] = `${value.slice(0, 2000)}…`;
    } else {
      capped[key] = value;
    }
  }
  let json = JSON.stringify(capped);
  if (new TextEncoder().encode(json).length <= maxBytes) return capped;
  // Still too large: keep scalar fields only, then truncate.
  const scalars: Record<string, unknown> = { _truncated: true };
  for (const [key, value] of Object.entries(capped)) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      scalars[key] = typeof value === "string" ? value.slice(0, 500) : value;
    }
  }
  json = JSON.stringify(scalars);
  if (new TextEncoder().encode(json).length <= maxBytes) return scalars;
  return { _truncated: true };
}

/**
 * Maps one record to a NormalizedBusiness, or returns null when it has no
 * usable name (such rows are counted as errors by the caller).
 */
export function normalizeRecord(
  record: Record<string, unknown>,
  mapping: Partial<Record<FieldKey, string>>,
): NormalizedBusiness | null {
  const has = (field: FieldKey) => mapping[field] !== undefined;
  const get = (field: FieldKey): unknown => {
    const column = mapping[field];
    return column === undefined ? undefined : record[column];
  };

  const name = text(get("name"));
  if (!name) return null;

  const phoneRaw = text(get("phone"));
  const website = has("website") ? (text(get("website")) ?? "") : null;
  const address = text(get("address"));
  const point =
    parseCoordinates(get("coordinates")) ?? pointFrom(get("latitude"), get("longitude"));
  const postalCode =
    parsePostalCode(get("postalCode")) ??
    postalCodeFromDetailedAddress(get("detailedAddress")) ??
    postalCodeFromAddress(address);

  return {
    kgmid: text(get("kgmid")),
    placeId: text(get("placeId")),
    cid: text(get("cid")),
    name: name.slice(0, 500),
    mainCategory: text(get("mainCategory")),
    address,
    phoneRaw,
    phoneE164: toUsE164(phoneRaw),
    website,
    gbpUrl: text(get("gbpUrl")),
    rating: has("rating") ? parseNumber(get("rating")) : null,
    reviewCount: has("reviewCount")
      ? isEmptyStructured(get("reviewCount"))
        ? 0
        : parseCount(get("reviewCount"))
      : null,
    imageCount: has("imageCount") ? parseCount(get("imageCount")) : null,
    canClaim: has("canClaim") ? parseBool(get("canClaim")) : null,
    hasDescription: has("description") ? presence(get("description")) : null,
    hasHours: has("hours") ? presence(get("hours")) : null,
    ownerPostsCount: has("ownerPosts") ? countOwnerPosts(get("ownerPosts")) : null,
    isPermanentlyClosed: has("isPermanentlyClosed") ? parseBool(get("isPermanentlyClosed")) : null,
    isTemporarilyClosed: has("isTemporarilyClosed") ? parseBool(get("isTemporarilyClosed")) : null,
    email: has("email") ? firstEmail(get("email")) : null,
    point,
    postalCode,
    rawPayload: capRawPayload(record),
  };
}
