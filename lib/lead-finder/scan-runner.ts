/**
 * The `lead-scan.run` job: fetch → normalize → dedupe → score → upsert CRM.
 * Progress counters are written to lead_scans as it goes; the scan page polls.
 * Safe to retry: a scan that is already finished is left alone, and upserts are idempotent.
 */
import { and, eq, sql } from "drizzle-orm";
import { leadScans } from "@/lib/db/schema";
import { ensureProspectPipeline, upsertScannedBusiness } from "./crm";
import type { LeadFinderDb } from "./db";
import { importBusinesses } from "./sources/csv-import";
import { getLeadSource } from "./sources/index";
import { LeadSourceInputError, LeadSourceUnavailableError, type NormalizedBusiness } from "./types";

export const LEAD_SCAN_QUEUE = "lead-scan.run";

export interface LeadScanJobPayload {
  scanId: string;
  tenantId: string;
}

export interface ScanRunnerDeps {
  /** Loads an uploaded source file (CSV/JSON) from storage. */
  loadSourceFile: (key: string) => Promise<string>;
}

const PROGRESS_EVERY = 5;

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
  try {
    const source = getLeadSource(scan.source);
    if (!source) return fail(`Unknown lead source: ${scan.source}`);
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

  const { selected, skippedClosed } = selectBusinesses(businesses, scan.maxResults);
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

  for (const business of selected) {
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
        });
        return { status: "cancelled" };
      }
    }
    try {
      const outcome = await upsertScannedBusiness(db, { tenantId, scanId, business, pipeline });
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
      completedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)));
  return { status: "completed" };
}
