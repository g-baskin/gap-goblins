/**
 * Tenant-scoped reads and writes for Lead Finder surfaces. Every function takes
 * the tenant id first and filters on it, so a caller can never reach another
 * tenant's rows by guessing an id.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import {
  contacts,
  deals,
  leadBusinesses,
  leadReports,
  leadScanResults,
  leadScans,
  stages,
  tenantBranding,
} from "@/lib/db/schema";
import { isTenantStorageKey, type LeadFinderExecutor } from "./db";
import { type GapFlags, parseStoredFlags } from "./scoring";
import { DEFAULT_MAX_RESULTS, maxResultsCap } from "./scoring-config";
import type { LeadSourceId } from "./types";

export type LeadScanRow = typeof leadScans.$inferSelect;
export type LeadBusinessRow = typeof leadBusinesses.$inferSelect;
export type TenantBrandingRow = typeof tenantBranding.$inferSelect;

export interface CreateScanInput {
  niche: string;
  location: string;
  maxResults?: number;
  source: LeadSourceId;
  sourceFileKey?: string | null;
  sourceFileName?: string | null;
  createdBy?: string | null;
}

export function clampMaxResults(value: number | undefined): number {
  const cap = maxResultsCap();
  if (value === undefined || !Number.isFinite(value)) return Math.min(DEFAULT_MAX_RESULTS, cap);
  return Math.max(1, Math.min(Math.floor(value), cap));
}

export async function createScan(
  db: LeadFinderExecutor,
  tenantId: string,
  input: CreateScanInput,
): Promise<LeadScanRow> {
  const [row] = await db
    .insert(leadScans)
    .values({
      tenantId,
      niche: input.niche.trim().slice(0, 200),
      location: input.location.trim().slice(0, 200),
      maxResults: clampMaxResults(input.maxResults),
      source: input.source,
      sourceFileKey: input.sourceFileKey ?? null,
      sourceFileName: input.sourceFileName?.slice(0, 255) ?? null,
      createdBy: input.createdBy ?? null,
      status: "queued",
    })
    .returning();
  return row;
}

export async function listScans(db: LeadFinderExecutor, tenantId: string, limit = 50) {
  return db
    .select()
    .from(leadScans)
    .where(eq(leadScans.tenantId, tenantId))
    .orderBy(desc(leadScans.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function getScan(db: LeadFinderExecutor, tenantId: string, scanId: string) {
  const [row] = await db
    .select()
    .from(leadScans)
    .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)))
    .limit(1);
  return row ?? null;
}

/** Marks a queued/running scan cancelled. Returns false if not found or already finished. */
export async function cancelScan(db: LeadFinderExecutor, tenantId: string, scanId: string) {
  const rows = await db
    .update(leadScans)
    .set({
      status: "cancelled",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(leadScans.tenantId, tenantId),
        eq(leadScans.id, scanId),
        sql`${leadScans.status} in ('queued', 'running')`,
      ),
    )
    .returning({ id: leadScans.id });
  return rows.length > 0;
}

export async function markScanFailed(
  db: LeadFinderExecutor,
  tenantId: string,
  scanId: string,
  message: string,
) {
  await db
    .update(leadScans)
    .set({
      status: "failed",
      errorMessage: message.slice(0, 1000),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(leadScans.tenantId, tenantId), eq(leadScans.id, scanId)));
}

export interface ScanResultListItem {
  scanResultId: string;
  businessId: string;
  name: string;
  mainCategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  score: number;
  flags: GapFlags;
  contactId: string | null;
  dealId: string | null;
}

/** A scan's results, weakest online presence (highest score) first. */
export async function listScanResults(
  db: LeadFinderExecutor,
  tenantId: string,
  scanId: string,
): Promise<ScanResultListItem[]> {
  const rows = await db
    .select({
      scanResultId: leadScanResults.id,
      businessId: leadBusinesses.id,
      name: leadBusinesses.name,
      mainCategory: leadBusinesses.mainCategory,
      address: leadBusinesses.address,
      phoneE164: leadBusinesses.phoneE164,
      phoneRaw: leadBusinesses.phoneRaw,
      website: leadBusinesses.website,
      rating: leadBusinesses.rating,
      reviewCount: leadBusinesses.reviewCount,
      score: leadScanResults.score,
      flags: leadScanResults.flags,
      contactId: leadBusinesses.contactId,
      dealId: leadBusinesses.dealId,
    })
    .from(leadScanResults)
    .innerJoin(
      leadBusinesses,
      and(
        eq(leadBusinesses.id, leadScanResults.businessId),
        eq(leadBusinesses.tenantId, leadScanResults.tenantId),
      ),
    )
    .where(and(eq(leadScanResults.tenantId, tenantId), eq(leadScanResults.scanId, scanId)))
    .orderBy(desc(leadScanResults.score), leadBusinesses.name);
  return rows.map(({ phoneE164, phoneRaw, flags, ...row }) => ({
    ...row,
    phone: phoneE164 ?? phoneRaw,
    flags: parseStoredFlags(flags),
  }));
}

export interface BusinessDetail {
  business: LeadBusinessRow;
  latestResult: {
    id: string;
    scanId: string;
    score: number;
    flags: GapFlags;
    rubricVersion: string;
    createdAt: string;
  } | null;
  history: { id: string; scanId: string; score: number; createdAt: string }[];
  contact: { id: string; name: string | null } | null;
  deal: { id: string; name: string; stageName: string | null } | null;
  reports: { id: string; generatedAt: string; rubricVersion: string; scanResultId: string }[];
}

export async function getBusinessDetail(
  db: LeadFinderExecutor,
  tenantId: string,
  businessId: string,
): Promise<BusinessDetail | null> {
  const [business] = await db
    .select()
    .from(leadBusinesses)
    .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.id, businessId)))
    .limit(1);
  if (!business) return null;

  const results = await db
    .select({
      id: leadScanResults.id,
      scanId: leadScanResults.scanId,
      score: leadScanResults.score,
      flags: leadScanResults.flags,
      rubricVersion: leadScanResults.rubricVersion,
      createdAt: leadScanResults.createdAt,
    })
    .from(leadScanResults)
    .where(and(eq(leadScanResults.tenantId, tenantId), eq(leadScanResults.businessId, businessId)))
    .orderBy(desc(leadScanResults.createdAt))
    .limit(20);

  const [contact] = business.contactId
    ? await db
        .select({ id: contacts.id, name: contacts.company })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, business.contactId)))
        .limit(1)
    : [];
  const [deal] = business.dealId
    ? await db
        .select({ id: deals.id, name: deals.name, stageName: stages.name })
        .from(deals)
        .leftJoin(stages, and(eq(stages.id, deals.stageId), eq(stages.tenantId, deals.tenantId)))
        .where(and(eq(deals.tenantId, tenantId), eq(deals.id, business.dealId)))
        .limit(1)
    : [];
  const reports = await db
    .select({
      id: leadReports.id,
      generatedAt: leadReports.generatedAt,
      rubricVersion: leadReports.rubricVersion,
      scanResultId: leadReports.scanResultId,
    })
    .from(leadReports)
    .where(and(eq(leadReports.tenantId, tenantId), eq(leadReports.businessId, businessId)))
    .orderBy(desc(leadReports.generatedAt))
    .limit(10);

  const latest = results[0];
  return {
    business,
    latestResult: latest ? { ...latest, flags: parseStoredFlags(latest.flags) } : null,
    history: results.map(({ id, scanId, score, createdAt }) => ({ id, scanId, score, createdAt })),
    contact: contact ?? null,
    deal: deal ?? null,
    reports,
  };
}

export async function getScanResultForBusiness(
  db: LeadFinderExecutor,
  tenantId: string,
  businessId: string,
  scanResultId?: string | null,
) {
  const conditions = [
    eq(leadScanResults.tenantId, tenantId),
    eq(leadScanResults.businessId, businessId),
  ];
  if (scanResultId) conditions.push(eq(leadScanResults.id, scanResultId));
  const [row] = await db
    .select()
    .from(leadScanResults)
    .where(and(...conditions))
    .orderBy(desc(leadScanResults.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getReport(db: LeadFinderExecutor, tenantId: string, reportId: string) {
  const [row] = await db
    .select()
    .from(leadReports)
    .where(and(eq(leadReports.tenantId, tenantId), eq(leadReports.id, reportId)))
    .limit(1);
  return row ?? null;
}

export async function insertReport(
  db: LeadFinderExecutor,
  tenantId: string,
  input: {
    businessId: string;
    scanResultId: string;
    storageKey: string;
    rubricVersion: string;
    generatedBy?: string | null;
  },
) {
  const [row] = await db
    .insert(leadReports)
    .values({ tenantId, ...input, generatedBy: input.generatedBy ?? null })
    .returning();
  return row;
}

export async function getBranding(
  db: LeadFinderExecutor,
  tenantId: string,
): Promise<TenantBrandingRow | null> {
  const [row] = await db
    .select()
    .from(tenantBranding)
    .where(eq(tenantBranding.tenantId, tenantId))
    .limit(1);
  return row ?? null;
}

export type BrandingInput = Partial<
  Omit<TenantBrandingRow, "id" | "tenantId" | "createdAt" | "updatedAt">
>;

export async function upsertBranding(
  db: LeadFinderExecutor,
  tenantId: string,
  input: BrandingInput,
): Promise<TenantBrandingRow> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(tenantBranding)
    .values({ tenantId, ...input, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: tenantBranding.tenantId,
      set: { ...input, updatedAt: now },
    })
    .returning();
  return row;
}

/** Sets or clears the logo key. Keys must live under the tenant's storage prefix. */
export async function setBrandingLogo(
  db: LeadFinderExecutor,
  tenantId: string,
  logoStorageKey: string | null,
): Promise<TenantBrandingRow> {
  if (logoStorageKey !== null && !isTenantStorageKey(tenantId, logoStorageKey)) {
    throw new Error("Logo key is outside the tenant's storage prefix");
  }
  return upsertBranding(db, tenantId, { logoStorageKey });
}
