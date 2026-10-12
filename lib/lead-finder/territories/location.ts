/**
 * Reads a business's location from source data. Pure and deterministic.
 *
 * omkar Google Maps Extractor records carry `coordinates: { latitude, longitude }` and
 * `detailed_address: { postal_code, ... }` (verified against the desktop app's own place
 * cache, 2026-10-12). CSV exports may hold those as JSON text, as "lat, lng" text, or as
 * separate latitude / longitude / postal code columns. Anything unreadable is null, never guessed.
 */
import type { GeoPoint } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || trimmed.length > 4000) return null;
    try {
      return asRecord(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function coordinate(value: unknown, limit: number): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\s*-?\d{1,3}(\.\d+)?\s*$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

/** A point from two values, or null. (0, 0) is treated as missing: it is a common placeholder. */
export function pointFrom(lat: unknown, lng: unknown): GeoPoint | null {
  const la = coordinate(lat, 90);
  const ln = coordinate(lng, 180);
  if (la === null || ln === null || (la === 0 && ln === 0)) return null;
  return { lat: la, lng: ln };
}

/** Parses a coordinates value: `{latitude, longitude}`, `{lat, lng}`, its JSON text, or "lat, lng". */
export function parseCoordinates(value: unknown): GeoPoint | null {
  const record = asRecord(value);
  if (record) {
    return pointFrom(record.latitude ?? record.lat, record.longitude ?? record.lng ?? record.lon);
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (match) return pointFrom(match[1], match[2]);
  }
  return null;
}

/** A 5-digit ZIP from a postal code value ("22401", "22401-1234", 22401). */
export function parsePostalCode(value: unknown): string | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  const match = text.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match?.[1] ?? null;
}

/** The ZIP inside `detailed_address` (object or JSON text), or null. */
export function postalCodeFromDetailedAddress(value: unknown): string | null {
  const record = asRecord(value);
  return record ? parsePostalCode(record.postal_code ?? record.postalCode ?? record.zip) : null;
}

/**
 * The ZIP at the end of a US address ("…, Fredericksburg, VA 22401" or "… VA 22401-1234, USA").
 * Requires a state code before it, so a street number like "12345 Main St" is never read as a ZIP.
 */
export function postalCodeFromAddress(address: string | null): string | null {
  if (!address || address.length > 500) return null;
  const match = address.match(
    /\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\s*(?:,\s*(?:USA|US|United States))?\s*$/,
  );
  return match?.[1] ?? null;
}
