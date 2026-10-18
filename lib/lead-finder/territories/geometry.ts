/**
 * Territory geometry: validating drawn areas and deciding whether a business is inside.
 *
 * Point-in-polygon, ring validation and the ZIP-list parser are adapted from PawOs2
 * (packages/domain/src/lessons/territories.ts @ b78f88e), itself adapted from
 * proximity-scheduling's geo.ts and boundary-validation.ts. See PROVENANCE.md.
 * Coordinates are treated as a flat plane, which is accurate enough at city scale and
 * matches the source. Areas crossing the antimeridian are rejected.
 */
import {
  type BusinessLocation,
  type GeoPoint,
  type GeoPolygon,
  TERRITORY_LIMITS,
  type TerritoryShape,
  type TerritoryStatus,
} from "./types";

const EPSILON = 1e-12;

export type GeometryResult<T> = { ok: true; value: T } | { ok: false; error: string };

function turn(a: GeoPoint, b: GeoPoint, c: GeoPoint): number {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function onSegment(a: GeoPoint, b: GeoPoint, point: GeoPoint): boolean {
  return (
    Math.abs(turn(a, b, point)) <= EPSILON &&
    point.lng >= Math.min(a.lng, b.lng) - EPSILON &&
    point.lng <= Math.max(a.lng, b.lng) + EPSILON &&
    point.lat >= Math.min(a.lat, b.lat) - EPSILON &&
    point.lat <= Math.max(a.lat, b.lat) + EPSILON
  );
}

function edgesMeet(a: GeoPoint, b: GeoPoint, c: GeoPoint, d: GeoPoint): boolean {
  const first = turn(a, b, c);
  const second = turn(a, b, d);
  const third = turn(c, d, a);
  const fourth = turn(c, d, b);
  return (
    (((first > EPSILON && second < -EPSILON) || (first < -EPSILON && second > EPSILON)) &&
      ((third > EPSILON && fourth < -EPSILON) || (third < -EPSILON && fourth > EPSILON))) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
}

export function isGeoPoint(point: unknown): point is GeoPoint {
  if (typeof point !== "object" || point === null) return false;
  const { lat, lng } = point as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  );
}

/** Why a ring cannot be used, or null when it is a simple closed shape with area. */
export function ringError(points: readonly GeoPoint[]): string | null {
  if (points.length < 3) return "An area needs at least 3 corners";
  if (points.length > TERRITORY_LIMITS.cornersPerRing) {
    return `An area can have at most ${TERRITORY_LIMITS.cornersPerRing} corners`;
  }
  const seen = new Set<string>();
  for (const point of points) {
    if (!isGeoPoint(point)) return "A corner has invalid coordinates";
    const key = `${point.lat}:${point.lng}`;
    if (seen.has(key)) return "An area repeats a corner";
    seen.add(key);
  }
  const origin = points[0];
  if (!origin) return "An area needs at least 3 corners";
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const c = points[(index + 2) % points.length];
    if (!a || !b || !c) return "An area needs at least 3 corners";
    if (Math.abs(a.lng - b.lng) >= 180) return "Areas crossing the date line are not supported";
    if (
      Math.abs(turn(a, b, c)) <= EPSILON &&
      (b.lng - a.lng) * (c.lng - b.lng) + (b.lat - a.lat) * (c.lat - b.lat) < 0
    ) {
      return "An area folds back on itself";
    }
    area += turn(origin, a, b);
    for (let other = index + 2; other < points.length; other += 1) {
      if (index === 0 && other === points.length - 1) continue;
      const d = points[other];
      const e = points[(other + 1) % points.length];
      if (d && e && edgesMeet(a, b, d, e)) return "An area's edges cross each other";
    }
  }
  return Math.abs(area) <= EPSILON ? "An area has no size" : null;
}

type Relation = "inside" | "boundary" | "outside";

function ringRelation(point: GeoPoint, ring: readonly GeoPoint[]): Relation {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) return "outside";
    if (onSegment(a, b, point)) return "boundary";
    if (
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng
    ) {
      inside = !inside;
    }
  }
  return inside ? "inside" : "outside";
}

function polygonRelation(point: GeoPoint, polygon: GeoPolygon): Relation {
  const outer = ringRelation(point, polygon.outer);
  if (outer !== "inside") return outer;
  for (const hole of polygon.holes) {
    const relation = ringRelation(point, hole);
    if (relation === "inside") return "outside";
    if (relation === "boundary") return "boundary";
  }
  return "inside";
}

function ringsMeet(a: readonly GeoPoint[], b: readonly GeoPoint[]): boolean {
  return a.some((point, index) => {
    const next = a[(index + 1) % a.length];
    return (
      next &&
      b.some((other, otherIndex) => {
        const otherNext = b[(otherIndex + 1) % b.length];
        return otherNext && edgesMeet(point, next, other, otherNext);
      })
    );
  });
}

/** Why a drawn area cannot be used, or null when it is valid. */
export function polygonError(polygon: GeoPolygon): string | null {
  if (polygon.holes.length > TERRITORY_LIMITS.holesPerArea) {
    return `An area can have at most ${TERRITORY_LIMITS.holesPerArea} holes`;
  }
  const outerError = ringError(polygon.outer);
  if (outerError) return outerError;
  for (const [index, hole] of polygon.holes.entries()) {
    const error = ringError(hole);
    if (error) return error;
    if (
      hole.some((point) => ringRelation(point, polygon.outer) !== "inside") ||
      ringsMeet(hole, polygon.outer)
    ) {
      return "A hole must sit fully inside its area";
    }
    for (const previous of polygon.holes.slice(0, index)) {
      if (
        ringsMeet(hole, previous) ||
        hole.some((point) => ringRelation(point, previous) !== "outside") ||
        previous.some((point) => ringRelation(point, hole) !== "outside")
      ) {
        return "Holes in an area must not overlap";
      }
    }
  }
  return null;
}

/** Checks a territory's size limits and every drawn area. ZIP outlines come from the Census. */
export function territoryShapeError(shape: TerritoryShape): string | null {
  if (shape.polygons.length > TERRITORY_LIMITS.drawnAreas) {
    return `A territory can have at most ${TERRITORY_LIMITS.drawnAreas} drawn areas`;
  }
  if (shape.zips.length > TERRITORY_LIMITS.zips) {
    return `A territory can have at most ${TERRITORY_LIMITS.zips} ZIP codes`;
  }
  if (shape.polygons.length === 0 && shape.zips.length === 0) {
    return "Add at least one ZIP code or draw an area";
  }
  let corners = 0;
  for (const polygon of [...shape.polygons, ...shape.zips.flatMap((zip) => zip.polygons)]) {
    corners += polygon.outer.length + polygon.holes.reduce((sum, hole) => sum + hole.length, 0);
  }
  if (corners > TERRITORY_LIMITS.totalCorners) return "This territory's outline is too detailed";
  for (const polygon of shape.polygons) {
    const error = polygonError(polygon);
    if (error) return error;
  }
  return null;
}

/** Parses a typed ZIP list ("22401, 22405 22407") into sorted unique 5-digit ZIPs. */
export function parseZipList(value: string): GeometryResult<string[]> {
  if (value.length > 10_000) return { ok: false, error: "The ZIP list is too long" };
  const zips = value
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  const bad = zips.find((zip) => !/^\d{5}$/.test(zip));
  if (bad !== undefined) return { ok: false, error: `"${bad.slice(0, 20)}" is not a 5-digit ZIP` };
  const unique = [...new Set(zips)].sort();
  if (unique.length > TERRITORY_LIMITS.zips) {
    return { ok: false, error: `A territory can have at most ${TERRITORY_LIMITS.zips} ZIP codes` };
  }
  return { ok: true, value: unique };
}

/**
 * Decides whether a business is inside a territory. Order matters:
 * 1. A map point inside a drawn area or a ZIP outline is inside (edges count as inside).
 * 2. A postal code that is one of the territory's ZIPs is inside. ZIP labels and Census ZIP
 *    areas differ near edges, so the label alone is enough to include a lead.
 * 3. A known map point that matched nothing is outside.
 * 4. With no map point, a known postal code is outside only when the territory is ZIPs alone;
 *    a drawn area could still contain the business, so that case is unknown.
 * 5. Otherwise unknown ("Not checked"). Unknown is never treated as outside.
 */
export function territoryMembership(
  shape: TerritoryShape,
  location: BusinessLocation,
): TerritoryStatus {
  const point = location.point && isGeoPoint(location.point) ? location.point : null;
  if (point) {
    const shapes = [...shape.polygons, ...shape.zips.flatMap((zip) => zip.polygons)];
    if (shapes.some((polygon) => polygonRelation(point, polygon) !== "outside")) return "inside";
  }
  const postalCode = location.postalCode;
  if (postalCode && shape.zips.some((zip) => zip.zip === postalCode)) return "inside";
  if (point) return "outside";
  if (postalCode && shape.polygons.length === 0) return "outside";
  return "unknown";
}
