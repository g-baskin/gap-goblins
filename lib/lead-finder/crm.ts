/**
 * CRM side of Lead Finder: the per-tenant "Gap Goblins Prospects" pipeline and
 * the idempotent business → contact + deal upsert.
 *
 * Invariants:
 * - Every query is scoped by tenant_id.
 * - Re-scans never create a second contact or deal for the same business.
 * - Deal stages only ever move forward (by stage display order); re-scans never move them.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import {
  contacts,
  contactTimeline,
  dealStageHistory,
  deals,
  leadBusinesses,
  leadScanResults,
  pipelines,
  stages,
} from "@/lib/db/schema";
import type { LeadFinderExecutor } from "./db";
import { type ScoreResult, scoreBusiness } from "./scoring";
import type { NormalizedBusiness } from "./types";

export const PROSPECT_PIPELINE_SLUG = "gap-goblins-prospects";
export const PROSPECT_PIPELINE_NAME = "Gap Goblins Prospects";
export const LEAD_SOURCE_TAG = "gap-goblins";

export const PROSPECT_STAGES = [
  { slug: "new-lead", name: "New Lead", isTerminal: false, isPositive: null },
  { slug: "report-ready", name: "Report Ready", isTerminal: false, isPositive: null },
  { slug: "contacted", name: "Contacted", isTerminal: false, isPositive: null },
  { slug: "replied", name: "Replied", isTerminal: false, isPositive: null },
  { slug: "meeting-booked", name: "Meeting Booked", isTerminal: false, isPositive: null },
  { slug: "won", name: "Won", isTerminal: true, isPositive: true },
  { slug: "lost", name: "Lost", isTerminal: true, isPositive: false },
] as const;
export type ProspectStageSlug = (typeof PROSPECT_STAGES)[number]["slug"];

export interface ProspectPipeline {
  pipelineId: string;
  stages: Record<ProspectStageSlug, { id: string; displayOrder: number }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Idempotently creates the tenant's prospects pipeline and any missing stages.
 * A transaction-scoped advisory lock per tenant prevents duplicate pipelines
 * when two scans start at once (pipelines has no unique (tenant, slug) index).
 */
export async function ensureProspectPipeline(
  db: LeadFinderExecutor,
  tenantId: string,
): Promise<ProspectPipeline> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`gap-goblins-pipeline:${tenantId}`}))`,
    );
    let [pipeline] = await tx
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, PROSPECT_PIPELINE_SLUG)))
      .limit(1);
    if (!pipeline) {
      const now = nowIso();
      [pipeline] = await tx
        .insert(pipelines)
        .values({
          tenantId,
          name: PROSPECT_PIPELINE_NAME,
          slug: PROSPECT_PIPELINE_SLUG,
          description: "Businesses found by Gap Goblins scans.",
          isActive: true,
          displayOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: pipelines.id });
    }
    const existing = await tx
      .select({ id: stages.id, slug: stages.slug, displayOrder: stages.displayOrder })
      .from(stages)
      .where(and(eq(stages.tenantId, tenantId), eq(stages.pipelineId, pipeline.id)));
    const bySlug = new Map(existing.map((s) => [s.slug, s]));
    const missing = PROSPECT_STAGES.map((stage, index) => ({ ...stage, index })).filter(
      (stage) => !bySlug.has(stage.slug),
    );
    if (missing.length > 0) {
      const inserted = await tx
        .insert(stages)
        .values(
          missing.map((stage) => ({
            tenantId,
            pipelineId: pipeline.id,
            name: stage.name,
            slug: stage.slug,
            displayOrder: stage.index,
            isTerminal: stage.isTerminal,
            isPositive: stage.isPositive,
            createdAt: nowIso(),
          })),
        )
        .returning({ id: stages.id, slug: stages.slug, displayOrder: stages.displayOrder });
      for (const s of inserted) bySlug.set(s.slug, s);
    }
    const stageMap = Object.fromEntries(
      PROSPECT_STAGES.map((stage) => {
        const row = bySlug.get(stage.slug);
        if (!row) throw new Error(`Stage ${stage.slug} missing after seed`);
        return [stage.slug, { id: row.id, displayOrder: row.displayOrder }];
      }),
    ) as ProspectPipeline["stages"];
    return { pipelineId: pipeline.id, stages: stageMap };
  });
}

/** Dedupe keys in priority order: kgmid → place_id → cid → phone_e164 → gbp_url. */
export const DEDUPE_ORDER = ["kgmid", "placeId", "cid", "phoneE164", "gbpUrl"] as const;
export type DedupeKey = (typeof DEDUPE_ORDER)[number];

export function dedupeCandidates(
  business: Pick<NormalizedBusiness, DedupeKey>,
): { key: DedupeKey; value: string }[] {
  const out: { key: DedupeKey; value: string }[] = [];
  for (const key of DEDUPE_ORDER) {
    const value = business[key]?.trim();
    if (value) out.push({ key, value });
  }
  return out;
}

const dedupeColumns = {
  kgmid: leadBusinesses.kgmid,
  placeId: leadBusinesses.placeId,
  cid: leadBusinesses.cid,
  phoneE164: leadBusinesses.phoneE164,
  gbpUrl: leadBusinesses.gbpUrl,
} as const;

/** Finds the tenant's existing business for this record, trying keys in dedupe order. */
export async function findExistingBusiness(
  db: LeadFinderExecutor,
  tenantId: string,
  business: Pick<NormalizedBusiness, DedupeKey>,
): Promise<{ id: string; matchedOn: DedupeKey } | null> {
  for (const candidate of dedupeCandidates(business)) {
    const [row] = await db
      .select({ id: leadBusinesses.id })
      .from(leadBusinesses)
      .where(
        and(
          eq(leadBusinesses.tenantId, tenantId),
          eq(dedupeColumns[candidate.key], candidate.value),
        ),
      )
      .orderBy(leadBusinesses.createdAt)
      .limit(1);
    if (row) return { id: row.id, matchedOn: candidate.key };
  }
  return null;
}

function businessColumns(business: NormalizedBusiness) {
  return {
    placeId: business.placeId,
    cid: business.cid,
    name: business.name,
    mainCategory: business.mainCategory,
    address: business.address,
    phoneRaw: business.phoneRaw,
    phoneE164: business.phoneE164,
    website: business.website,
    gbpUrl: business.gbpUrl,
    rating: business.rating,
    reviewCount: business.reviewCount,
    imageCount: business.imageCount,
    canClaim: business.canClaim,
    hasDescription: business.hasDescription,
    hasHours: business.hasHours,
    ownerPostsCount: business.ownerPostsCount,
    isPermanentlyClosed: business.isPermanentlyClosed,
    isTemporarilyClosed: business.isTemporarilyClosed,
    rawPayload: business.rawPayload,
  };
}

export interface UpsertOutcome {
  businessId: string;
  contactId: string;
  dealId: string;
  scanResultId: string;
  created: boolean;
  score: ScoreResult;
  previousScore: number | null;
}

async function createContact(
  tx: LeadFinderExecutor,
  tenantId: string,
  business: NormalizedBusiness,
  scanId: string,
): Promise<string> {
  const now = nowIso();
  const [contact] = await tx
    .insert(contacts)
    .values({
      tenantId,
      // contacts.email is NOT NULL in the base schema. Prospects usually have no
      // email (Gap Goblins never discovers one), so store the source's email or "".
      email: business.email ?? "",
      firstName: business.name,
      company: business.name,
      phone: business.phoneE164 ?? business.phoneRaw,
      website: business.website || null,
      location: business.address,
      industry: business.mainCategory,
      contactStatus: "lead",
      source: LEAD_SOURCE_TAG,
      sourceDetail: `lead_scan:${scanId}`,
      originalSource: LEAD_SOURCE_TAG,
      latestSource: LEAD_SOURCE_TAG,
      tags: [LEAD_SOURCE_TAG],
      createdAt: now,
      updatedAt: now,
      firstTouchDate: now,
    })
    .returning({ id: contacts.id });
  return contact.id;
}

async function createDeal(
  tx: LeadFinderExecutor,
  tenantId: string,
  contactId: string,
  business: NormalizedBusiness,
  pipeline: ProspectPipeline,
): Promise<string> {
  const now = nowIso();
  const stageId = pipeline.stages["new-lead"].id;
  const [deal] = await tx
    .insert(deals)
    .values({
      tenantId,
      contactId,
      name: business.name,
      source: LEAD_SOURCE_TAG,
      stageId,
      status: "open",
      stageEnteredAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: deals.id });
  await tx.insert(dealStageHistory).values({
    dealId: deal.id,
    toStageId: stageId,
    changedAt: now,
    automated: true,
    triggerSource: LEAD_SOURCE_TAG,
    notes: "Created by Gap Goblins scan",
  });
  return deal.id;
}

async function contactExists(tx: LeadFinderExecutor, tenantId: string, id: string | null) {
  if (!id) return false;
  const [row] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, id)))
    .limit(1);
  return !!row;
}

async function dealExists(tx: LeadFinderExecutor, tenantId: string, id: string | null) {
  if (!id) return false;
  const [row] = await tx
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.id, id)))
    .limit(1);
  return !!row;
}

/**
 * Upserts one business for a scan: business row, scan result, contact + deal
 * (created once), and a timeline entry. Runs in one transaction with a
 * per-tenant-per-identity advisory lock so concurrent scans can't double-create.
 */
export async function upsertScannedBusiness(
  db: LeadFinderExecutor,
  input: {
    tenantId: string;
    scanId: string;
    business: NormalizedBusiness;
    pipeline: ProspectPipeline;
  },
): Promise<UpsertOutcome> {
  const { tenantId, scanId, business, pipeline } = input;
  const score = scoreBusiness(business);
  const lockKey = dedupeCandidates(business)[0]?.value ?? business.name.toLowerCase();

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`gap-goblins-business:${tenantId}:${lockKey}`}))`,
    );
    const existing = await findExistingBusiness(tx, tenantId, business);
    const now = nowIso();
    let businessId: string;
    let contactId: string | null = null;
    let dealId: string | null = null;
    let previousScore: number | null = null;

    if (existing) {
      const [row] = await tx
        .select({
          id: leadBusinesses.id,
          kgmid: leadBusinesses.kgmid,
          email: leadBusinesses.email,
          contactId: leadBusinesses.contactId,
          dealId: leadBusinesses.dealId,
        })
        .from(leadBusinesses)
        .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.id, existing.id)))
        .limit(1);
      businessId = row.id;
      contactId = (await contactExists(tx, tenantId, row.contactId)) ? row.contactId : null;
      dealId = (await dealExists(tx, tenantId, row.dealId)) ? row.dealId : null;
      const [prev] = await tx
        .select({ score: leadScanResults.score })
        .from(leadScanResults)
        .where(
          and(eq(leadScanResults.tenantId, tenantId), eq(leadScanResults.businessId, businessId)),
        )
        .orderBy(desc(leadScanResults.createdAt))
        .limit(1);
      previousScore = prev?.score ?? null;
      await tx
        .update(leadBusinesses)
        .set({
          ...businessColumns(business),
          // Keep a KGMID once known; only fill it if it was missing.
          kgmid: row.kgmid ?? business.kgmid,
          email: business.email ?? row.email,
          lastSeenScanId: scanId,
          updatedAt: now,
        })
        .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.id, businessId)));
    } else {
      const [row] = await tx
        .insert(leadBusinesses)
        .values({
          tenantId,
          ...businessColumns(business),
          kgmid: business.kgmid,
          email: business.email,
          firstSeenScanId: scanId,
          lastSeenScanId: scanId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: leadBusinesses.id });
      businessId = row.id;
    }

    const created = !contactId || !dealId;
    if (!contactId) contactId = await createContact(tx, tenantId, business, scanId);
    if (!dealId) dealId = await createDeal(tx, tenantId, contactId, business, pipeline);
    await tx
      .update(leadBusinesses)
      .set({ contactId, dealId })
      .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.id, businessId)));

    const [result] = await tx
      .insert(leadScanResults)
      .values({
        tenantId,
        scanId,
        businessId,
        score: score.score,
        flags: score.flags,
        rubricVersion: score.rubricVersion,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [leadScanResults.scanId, leadScanResults.businessId],
        set: { score: score.score, flags: score.flags, rubricVersion: score.rubricVersion },
      })
      .returning({ id: leadScanResults.id });

    await tx.insert(contactTimeline).values({
      tenantId,
      contactId,
      eventType: existing && !created ? "lead_rescanned" : "lead_found",
      title:
        existing && !created
          ? `Rescanned: score ${previousScore ?? "?"} → ${score.score}`
          : `Found by Gap Goblins scan: score ${score.score}`,
      description: business.name,
      metadata: { scanId, businessId, score: score.score, rubricVersion: score.rubricVersion },
      createdAt: now,
    });

    return {
      businessId,
      contactId,
      dealId,
      scanResultId: result.id,
      created: !existing || created,
      score,
      previousScore,
    };
  });
}

/**
 * Moves a deal forward to `target` if it is currently on an earlier stage of the
 * prospects pipeline. Never moves backward and never touches deals in other pipelines.
 * Returns true when the deal moved.
 */
export async function advanceDealForward(
  db: LeadFinderExecutor,
  input: {
    tenantId: string;
    dealId: string;
    target: ProspectStageSlug;
    pipeline: ProspectPipeline;
  },
): Promise<boolean> {
  const { tenantId, dealId, target, pipeline } = input;
  const targetStage = pipeline.stages[target];
  const [deal] = await db
    .select({ stageId: deals.stageId })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.id, dealId)))
    .limit(1);
  if (!deal) return false;
  const current = Object.values(pipeline.stages).find((s) => s.id === deal.stageId);
  if (!current || current.displayOrder >= targetStage.displayOrder) return false;
  const now = nowIso();
  await db
    .update(deals)
    .set({ stageId: targetStage.id, stageEnteredAt: now, updatedAt: now })
    .where(and(eq(deals.tenantId, tenantId), eq(deals.id, dealId)));
  await db.insert(dealStageHistory).values({
    dealId,
    fromStageId: deal.stageId,
    toStageId: targetStage.id,
    changedAt: now,
    automated: true,
    triggerSource: LEAD_SOURCE_TAG,
  });
  return true;
}
