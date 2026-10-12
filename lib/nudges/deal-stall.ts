import { and, asc, eq, isNotNull, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, deals, stages } from "@/lib/db/schema";
import { createHumanNudge, humanNudgeDedupExists } from "@/lib/nudges/human-nudges";
import type { HumanNudgePriority } from "@/lib/nudges/types";

export const DEAL_MILESTONE_NUDGE_TYPE = "deal_milestone";
export const DEAL_STALL_DAYS = 7;
export const HIGH_VALUE_DEAL_THRESHOLD = 50_000;
export const DEAL_STALL_SCAN_LIMIT = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DealNudgeCandidate = {
  dealId: string;
  dealName: string;
  amount: number | null;
  contactId: string;
  stageEnteredAt: string | null;
  expectedCloseDate: string | null;
  stageName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
};

export interface GenerateDealStallNudgesOptions {
  now?: Date;
  stallDays?: number;
  highValueThreshold?: number;
  limit?: number;
}

export interface DealStallNudgeBucketResult {
  scanned: number;
  created: number;
  skipped: number;
}

export interface GenerateDealStallNudgesResult {
  scanned: number;
  created: number;
  skipped: number;
  stalled: DealStallNudgeBucketResult;
  overdue: DealStallNudgeBucketResult;
}

export async function generateDealStallNudges(
  options: GenerateDealStallNudgesOptions = {},
): Promise<GenerateDealStallNudgesResult> {
  const now = options.now ?? new Date();
  const stallDays = options.stallDays ?? DEAL_STALL_DAYS;
  const highValueThreshold = options.highValueThreshold ?? HIGH_VALUE_DEAL_THRESHOLD;
  const limit = options.limit ?? DEAL_STALL_SCAN_LIMIT;

  const stalled = await generateStalledDealNudges({ now, stallDays, highValueThreshold, limit });
  const overdue = await generateOverdueDealNudges({ now, highValueThreshold, limit });

  return {
    scanned: stalled.scanned + overdue.scanned,
    created: stalled.created + overdue.created,
    skipped: stalled.skipped + overdue.skipped,
    stalled,
    overdue,
  };
}

async function generateStalledDealNudges(options: {
  now: Date;
  stallDays: number;
  highValueThreshold: number;
  limit: number;
}): Promise<DealStallNudgeBucketResult> {
  const cutoff = new Date(options.now.getTime() - options.stallDays * MS_PER_DAY).toISOString();
  const rows = await loadStalledDeals(cutoff, options.limit);
  const week = getIsoWeekParts(options.now);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.stageEnteredAt) {
      skipped++;
      continue;
    }

    const dedupKey = `deal:${row.dealId}:stalled:${week.year}-W${String(week.week).padStart(2, "0")}`;
    if (await humanNudgeDedupExists(dedupKey)) {
      skipped++;
      continue;
    }

    const contactName = formatContactName(row);
    const daysStalled = daysBetween(options.now, new Date(row.stageEnteredAt));
    const stageName = row.stageName ?? "this stage";
    const amountText = formatDealAmount(row.amount);

    await createHumanNudge({
      contactId: row.contactId,
      dealId: row.dealId,
      nudgeType: DEAL_MILESTONE_NUDGE_TYPE,
      title: `Move ${contactName}'s deal forward`,
      message: `${contactName}'s ${row.dealName}${amountText} has been in ${stageName} for ${daysStalled} days.`,
      suggestedAction: "call",
      priority: priorityForAmount(row.amount, options.highValueThreshold),
      dueDate: options.now.toISOString(),
      dedupKey,
      metadata: {
        reason: "deal_stalled",
        days_stalled: daysStalled,
        stage_name: stageName,
        deal_amount: row.amount,
      },
    });
    created++;
  }

  return { scanned: rows.length, created, skipped };
}

async function generateOverdueDealNudges(options: {
  now: Date;
  highValueThreshold: number;
  limit: number;
}): Promise<DealStallNudgeBucketResult> {
  const rows = await loadOverdueDeals(startOfUtcDay(options.now).toISOString(), options.limit);
  const month = `${options.now.getUTCFullYear()}-${String(options.now.getUTCMonth() + 1).padStart(2, "0")}`;
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.expectedCloseDate) {
      skipped++;
      continue;
    }

    const dedupKey = `deal:${row.dealId}:overdue:${month}`;
    if (await humanNudgeDedupExists(dedupKey)) {
      skipped++;
      continue;
    }

    const contactName = formatContactName(row);
    const daysOverdue = daysBetween(startOfUtcDay(options.now), new Date(row.expectedCloseDate));

    await createHumanNudge({
      contactId: row.contactId,
      dealId: row.dealId,
      nudgeType: DEAL_MILESTONE_NUDGE_TYPE,
      title: `Review ${contactName}'s overdue deal`,
      message: `${row.dealName} was expected to close ${daysOverdue} days ago.`,
      suggestedAction: "call",
      priority: priorityForAmount(row.amount, options.highValueThreshold, "high"),
      dueDate: options.now.toISOString(),
      dedupKey,
      metadata: {
        reason: "deal_overdue",
        days_overdue: daysOverdue,
        expected_close_date: row.expectedCloseDate,
        deal_amount: row.amount,
      },
    });
    created++;
  }

  return { scanned: rows.length, created, skipped };
}

async function loadStalledDeals(cutoff: string, limit: number): Promise<DealNudgeCandidate[]> {
  return db
    .select({
      dealId: deals.id,
      dealName: deals.name,
      amount: deals.amount,
      contactId: deals.contactId,
      stageEnteredAt: deals.stageEnteredAt,
      expectedCloseDate: deals.expectedCloseDate,
      stageName: stages.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
    })
    .from(deals)
    .innerJoin(contacts, eq(deals.contactId, contacts.id))
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(
      and(openDealCondition(), isNotNull(deals.stageEnteredAt), lte(deals.stageEnteredAt, cutoff)),
    )
    .orderBy(asc(deals.stageEnteredAt))
    .limit(limit);
}

async function loadOverdueDeals(todayStart: string, limit: number): Promise<DealNudgeCandidate[]> {
  return db
    .select({
      dealId: deals.id,
      dealName: deals.name,
      amount: deals.amount,
      contactId: deals.contactId,
      stageEnteredAt: deals.stageEnteredAt,
      expectedCloseDate: deals.expectedCloseDate,
      stageName: stages.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
    })
    .from(deals)
    .innerJoin(contacts, eq(deals.contactId, contacts.id))
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(
      and(
        openDealCondition(),
        isNotNull(deals.expectedCloseDate),
        lt(deals.expectedCloseDate, todayStart),
      ),
    )
    .orderBy(asc(deals.expectedCloseDate))
    .limit(limit);
}

function openDealCondition(): SQL | undefined {
  return and(
    or(eq(deals.status, "open"), isNull(deals.status)),
    or(eq(stages.isTerminal, false), isNull(stages.isTerminal)),
  );
}

function formatContactName(row: DealNudgeCandidate): string {
  const name = [row.contactFirstName, row.contactLastName].filter(Boolean).join(" ").trim();
  return name || row.contactEmail || "this contact";
}

function formatDealAmount(amount: number | null): string {
  if (amount == null || Number.isNaN(amount)) return "";
  return ` ($${Math.round(amount).toLocaleString("en-US")})`;
}

function priorityForAmount(
  amount: number | null,
  threshold: number,
  fallback: HumanNudgePriority = "medium",
): HumanNudgePriority {
  if (amount != null && amount > threshold) return "high";
  return fallback;
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getIsoWeekParts(date: Date): { year: number; week: number } {
  const utcDate = startOfUtcDay(date);
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - (utcDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}
