/**
 * Territory types shared by the territory editor, API routes, the scan job and tests.
 * Pure types and constants: safe to import from client components.
 */

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/** One closed area: an outer ring and optional holes. Rings omit the repeated closing corner. */
export interface GeoPolygon {
  readonly outer: readonly GeoPoint[];
  readonly holes: readonly (readonly GeoPoint[])[];
}

/** A ZIP code a territory covers, with the Census outline fetched when it was added. */
export interface TerritoryZip {
  readonly zip: string;
  /** Which dataset the outline came from, so a stale outline can be told apart later. */
  readonly source: string;
  readonly polygons: readonly GeoPolygon[];
}

/** The part of a territory that decides membership. */
export interface TerritoryShape {
  /** Areas drawn on the map. */
  readonly polygons: readonly GeoPolygon[];
  readonly zips: readonly TerritoryZip[];
}

/** Where a business sits relative to a territory. "unknown" shows as "Not checked". */
export type TerritoryStatus = "inside" | "outside" | "unknown";

/** What is known about a business's location. Either part may be missing. */
export interface BusinessLocation {
  readonly point: GeoPoint | null;
  readonly postalCode: string | null;
}

/** Size limits, adapted from PawOs2's service-area editor. */
export const TERRITORY_LIMITS = {
  nameLength: 120,
  drawnAreas: 50,
  zips: 300,
  cornersPerRing: 500,
  holesPerArea: 20,
  totalCorners: 50_000,
} as const;

export const TERRITORY_STATUS_LABELS: Record<TerritoryStatus, string> = {
  inside: "Inside",
  outside: "Outside",
  unknown: "Not checked",
};
