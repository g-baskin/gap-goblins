/**
 * The `lead-scan.run` job: fetch → normalize → dedupe → score → upsert CRM.
 * Progress counters are written to lead_scans as it goes; the scan page polls.
 * Safe to retry: a scan that is already finished is left alone, and upserts are idempotent.
 */
import { and, eq, sql } from "drizzle-orm";
import { leadScans } from "@/lib/db/schema";
import { ensureProspectPipeline, findStoredLocation, upsertScannedBusiness } from "./crm";
import type { LeadFinderDb, LeadFinderExecutor } from "./db";
import { importBusinesses } from "./sources/csv-import";
import { getLeadSource } from "./sources/index";
import type { CensusResult, GeocodeMatch } from "./territories/census";
import { territoryMembership } from "./territories/geometry";
import { getTerritory } from "./territories/store";
import type { TerritoryShape, TerritoryStatus } from "./territories/types";
import { LeadSourceInputError, LeadSourceUnavailableError, type NormalizedBusiness } from "./types";

export const LEAD_SCAN_QUEUE = "lead-scan.run";

export interface LeadScanJobPayload {
  scanId: string;
  tenantId: string;
}

export interface ScanRunnerDeps {
  /** Loads an uploaded source file (CSV/JSON) from storage. */
  loadSourceFile: (key: string) => Promise<string>;
  /**
   * Looks up a street address (the worker passes the Census geocoder). Only used for
   * territory scans, for businesses whose location is otherwise unknown. Optional:
   * without it those businesses stay "Not checked".
   */
  geocode?: (address: string) => Promise<CensusResult<GeocodeMatch>>;
}

const PROGRESS_EVERY = 5;
/** Most address lookups one scan makes, so a large import cannot hammer the Census service. */
export const GEOCODE_LIMIT_PER_SCAN = 100;
/** A failed address lookup is not retried for this long. */
const GEOCODE_RETRY_MS = 30 * 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

/** Applies the scan rules: skip permanently closed, then cap at max results. */
export function selectBusinesses(
  businesses: NormalizedBusiness[],
  maxResults: number,
  options: { includePermanentlyClosed?: boolean } = {},
): { selected: NormalizedBusiness[]; skippedClosed: number } {
  const open = options.includePermanentlyClosed
    ? businesses
    : businesses.filter((b) => b.isPermanentlyClosed !== true);
  const skippedClosed = businesses.length - open.length;
  return { selected: open.slice(0, maxResults), skippedClosed };
}

interface TerritoryCheck {
  status: TerritoryStatus;
  business: NormalizedBusiness;
  geocodeAttempted: boolean;
}

/**
 * Works out where a business sits relative to the scan's territory. Uses, in order: the
 * source's location, the location stored from earlier scans, then (only when still
 * unknown, within budget, and not tried recently) the address lookup.
 */
async function checkTerritory(
  db: LeadFinderExecutor,
  tenantId: string,
  shape: TerritoryShape,
  business: NormalizedBusiness,
  geocode: { lookup?: ScanRunnerDeps["geocode"]; remaining: number },
  now: number,
): Promise<TerritoryCheck> {
  let current = business;
  if (!current.point || !current.postalCode) {
    const stored = await findStoredLocation(db, tenantId, business);
    if (stored) {
      current = {
        ...current,
        point: current.point ?? stored.point,
        pointSource: current.point ? current.pointSource : (stored.pointSource ?? undefined),
        postalCode: current.postalCode ?? stored.postalCode,
      };
    }
    const status = territoryMembership(shape, current);
    const triedRecently =
      stored?.geocodeAttemptedAt !== null &&
      stored?.geocodeAttemptedAt !== undefined &&
      now - Date.parse(stored.geocodeAttemptedAt) < GEOCODE_RETRY_MS;
    if (
      status !== "unknown" ||
      current.point ||
      !current.address ||
      !geocode.lookup ||
      geocode.remaining <= 0 ||
      triedRecently
    ) {
      return { status, business: current, geocodeAttempted: false };
    }
    geocode.remaining -= 1;
    const found = await geocode.lookup(current.address);
    if (found.ok) {
      current = {
        ...current,
        point: found.value.point,
        pointSource: "census-geocoder",
        postalCode: current.postalCode ?? found.value.postalCode,
      };
    }
    return {
      status: territoryMembership(shape, current),
      business: current,
      geocodeAttempted: true,
    };
  }
  return {
    status: territoryMembership(shape, current),
    business: current,
    geocodeAttempted: false,
  };
}

export async function runLeadScan(
  db: LeadFinderDb,
  payload: LeadScanJobPayload,
  deps: ScanRunnerDeps,
): Promise<{ status: string }> {
  const { scanId, tenantId } = payload;
  const [scan] = await db
    .select()
    .from(leadScans)
    .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)))
    .limit(1);
  if (!scan) throw new Error(`Lead scan ${scanId} not found for tenant`);
  if (scan.status !== "queued" && scan.status !== "running") return { status: scan.status };

  const update = (values: Partial<typeof leadScans.$inferInsert>) =>
    db
      .update(leadScans)
      .set({ ...values, updatedAt: nowIso() })
      .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)));

  await update({
    status: "running",
    startedAt: scan.startedAt ?? nowIso(),
    errorMessage: null,
  });

  const fail = async (message: string) => {
    await update({ status: "failed", errorMessage: message.slice(0, 1000), completedAt: nowIso() });
    return { status: "failed" };
  };

  let businesses: NormalizedBusiness[];
  let rejectedRows = 0;
  let sampleData = false;
  try {
    const source = getLeadSource(scan.source);
    if (!source) return fail(`Unknown lead source: ${scan.source}`);
    sampleData = source.sampleData === true;
    if (scan.source === "csv-import") {
      if (!scan.sourceFileKey) return fail("This CSV scan has no uploaded file");
      const content = await deps.loadSourceFile(scan.sourceFileKey);
      const imported = importBusinesses({ name: scan.sourceFileName ?? "upload.csv", content });
      businesses = imported.businesses;
      rejectedRows = imported.rejectedRows;
    } else {
      businesses = await source.fetch(
        { niche: scan.niche, location: scan.location, maxResults: scan.maxResults },
        { tenantId },
      );
    }
  } catch (error) {
    if (error instanceof LeadSourceUnavailableError || error instanceof LeadSourceInputError) {
      return fail(error.message);
    }
    console.error("[lead-scan] source fetch failed", { scanId, error });
    return fail("The lead source failed. Try again, or use a different source.");
  }

  let territory: TerritoryShape | null = null;
  if (scan.territoryId) {
    territory = await getTerritory(db, tenantId, scan.territoryId);
    if (!territory) return fail("This scan's territory was deleted before the scan ran");
  }

  // With a territory, the max-results cap applies after outside businesses are skipped,
  // so a scan of 50 yields up to 50 businesses in (or possibly in) the territory.
  const { selected: open, skippedClosed } = selectBusinesses(
    businesses,
    territory ? businesses.length : scan.maxResults,
  );
  await update({
    foundCount: businesses.length,
    skippedClosedCount: skippedClosed,
    errorCount: rejectedRows,
  });

  const pipeline = await ensureProspectPipeline(db, tenantId);
  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = rejectedRows;
  let skippedOutside = 0;
  // Sample data has made-up addresses: never look them up, so they stay "Not checked".
  const geocode = {
    lookup: sampleData ? undefined : deps.geocode,
    remaining: GEOCODE_LIMIT_PER_SCAN,
  };
  const startedAt = Date.now();

  for (const candidate of open) {
    if (processed >= scan.maxResults) break;
    let business = candidate;
    let territoryStatus: TerritoryStatus | null = null;
    let geocodeAttempted = false;
    if (territory) {
      try {
        const check = await checkTerritory(db, tenantId, territory, candidate, geocode, startedAt);
        business = check.business;
        territoryStatus = check.status;
        geocodeAttempted = check.geocodeAttempted;
      } catch (error) {
        console.error("[lead-scan] territory check failed", { scanId, error });
        territoryStatus = "unknown";
      }
      if (territoryStatus === "outside") {
        skippedOutside += 1;
        continue;
      }
    }
    // Stop early if the scan was cancelled while running.
    if (processed % PROGRESS_EVERY === 0 && processed > 0) {
      const [current] = await db
        .select({ status: leadScans.status })
        .from(leadScans)
        .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)))
        .limit(1);
      if (current?.status === "cancelled") {
        await update({
          processedCount: processed,
          createdCount: created,
          updatedCount: updated,
          errorCount: errors,
          skippedOutsideTerritoryCount: skippedOutside,
        });
        return { status: "cancelled" };
      }
    }
    try {
      const outcome = await upsertScannedBusiness(db, {
        tenantId,
        scanId,
        business,
        pipeline,
        territoryStatus,
        geocodeAttempted,
      });
      if (outcome.created) created += 1;
      else updated += 1;
    } catch (error) {
      errors += 1;
      console.error("[lead-scan] business upsert failed", { scanId, name: business.name, error });
    }
    processed += 1;
    if (processed % PROGRESS_EVERY === 0) {
      await update({
        processedCount: processed,
        createdCount: created,
        updatedCount: updated,
        errorCount: errors,
        skippedOutsideTerritoryCount: skippedOutside,
      });
    }
  }

  await db
    .update(leadScans)
    .set({
      status: sql`case when ${leadScans.status} = 'cancelled' then 'cancelled' else 'completed' end`,
      processedCount: processed,
      createdCount: created,
      updatedCount: updated,
      errorCount: errors,
      skippedOutsideTerritoryCount: skippedOutside,
      completedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)));
  return { status: "completed" };
}
