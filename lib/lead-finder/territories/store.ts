/**
 * Tenant-scoped reads and writes for territories. Every function takes the tenant id and
 * filters on it, so a territory id from another tenant always reads as "not found".
 * Stored shapes are re-validated on the way out; a malformed row is treated as empty.
 */
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { leadTerritories } from "@/lib/db/schema";
import type { LeadFinderExecutor } from "../db";
import { territoryShapeError } from "./geometry";
import { TERRITORY_LIMITS, type TerritoryShape, type TerritoryZip } from "./types";

const pointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});
const ringSchema = z.array(pointSchema).min(3).max(TERRITORY_LIMITS.cornersPerRing);
export const polygonSchema = z.object({
  outer: ringSchema,
  holes: z.array(ringSchema).max(TERRITORY_LIMITS.holesPerArea).default([]),
});
const zipSchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  source: z.string().max(200),
  polygons: z.array(polygonSchema).min(1).max(TERRITORY_LIMITS.drawnAreas),
});

export interface TerritoryRecord extends TerritoryShape {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TerritorySummary {
  id: string;
  name: string;
  zipCodes: string[];
  drawnAreaCount: number;
  updatedAt: string;
}

function toRecord(row: typeof leadTerritories.$inferSelect): TerritoryRecord {
  const polygons = z.array(polygonSchema).safeParse(row.polygons);
  const zips = z.array(zipSchema).safeParse(row.zips);
  return {
    id: row.id,
    name: row.name,
    polygons: polygons.success ? polygons.data : [],
    zips: zips.success ? zips.data : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function summarize(territory: TerritoryRecord): TerritorySummary {
  return {
    id: territory.id,
    name: territory.name,
    zipCodes: territory.zips.map((zip) => zip.zip),
    drawnAreaCount: territory.polygons.length,
    updatedAt: territory.updatedAt,
  };
}

export async function listTerritories(
  db: LeadFinderExecutor,
  tenantId: string,
): Promise<TerritoryRecord[]> {
  const rows = await db
    .select()
    .from(leadTerritories)
    .where(eq(leadTerritories.tenantId, tenantId))
    .orderBy(asc(leadTerritories.name))
    .limit(200);
  return rows.map(toRecord);
}

export async function getTerritory(
  db: LeadFinderExecutor,
  tenantId: string,
  territoryId: string,
): Promise<TerritoryRecord | null> {
  const [row] = await db
    .select()
    .from(leadTerritories)
    .where(and(eq(leadTerritories.tenantId, tenantId), eq(leadTerritories.id, territoryId)))
    .limit(1);
  return row ? toRecord(row) : null;
}

export interface TerritoryInput extends TerritoryShape {
  name: string;
}

export type SaveResult =
  | { ok: true; territory: TerritoryRecord }
  | { ok: false; error: string; status: 400 | 404 | 409 };

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown; cause?: { code?: unknown } } | null)?.code;
  const causeCode = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return code === "23505" || causeCode === "23505";
}

function checkInput(input: TerritoryInput): string | null {
  const name = input.name.trim();
  if (!name) return "Name is required";
  if (name.length > TERRITORY_LIMITS.nameLength) {
    return `Name must be at most ${TERRITORY_LIMITS.nameLength} characters`;
  }
  return territoryShapeError(input);
}

function sortedZips(zips: readonly TerritoryZip[]): TerritoryZip[] {
  return [...zips].sort((a, b) => a.zip.localeCompare(b.zip));
}

/** Creates a territory, or updates it when `territoryId` is given. Names are unique per tenant. */
export async function saveTerritory(
  db: LeadFinderExecutor,
  tenantId: string,
  input: TerritoryInput,
  options: { territoryId?: string; createdBy?: string | null } = {},
): Promise<SaveResult> {
  const error = checkInput(input);
  if (error) return { ok: false, error, status: 400 };
  const values = {
    name: input.name.trim(),
    polygons: input.polygons,
    zips: sortedZips(input.zips),
    updatedAt: new Date().toISOString(),
  };
  try {
    if (options.territoryId) {
      const [row] = await db
        .update(leadTerritories)
        .set(values)
        .where(
          and(eq(leadTerritories.tenantId, tenantId), eq(leadTerritories.id, options.territoryId)),
        )
        .returning();
      return row
        ? { ok: true, territory: toRecord(row) }
        : { ok: false, error: "Territory not found", status: 404 };
    }
    const [row] = await db
      .insert(leadTerritories)
      .values({ tenantId, createdBy: options.createdBy ?? null, ...values })
      .returning();
    return { ok: true, territory: toRecord(row) };
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { ok: false, error: "A territory with this name already exists", status: 409 };
    }
    throw caught;
  }
}

/** Deletes a territory. Scans that targeted it keep its name and their results. */
export async function deleteTerritory(
  db: LeadFinderExecutor,
  tenantId: string,
  territoryId: string,
): Promise<boolean> {
  const rows = await db
    .delete(leadTerritories)
    .where(and(eq(leadTerritories.tenantId, tenantId), eq(leadTerritories.id, territoryId)))
    .returning({ id: leadTerritories.id });
  return rows.length > 0;
}
