/**
 * Builds gap reports from tenant data. Used by the preview route (web) and the
 * PDF job (worker). Storage access is injected so both runtimes can use it.
 */
import { randomUUID } from "node:crypto";
import { advanceDealForward, ensureProspectPipeline } from "./crm";
import { isTenantStorageKey, type LeadFinderDb, tenantStoragePrefix } from "./db";
import { toDataUri } from "./image-validation";
import { getBranding, getBusinessDetail, getScanResultForBusiness, insertReport } from "./queries";
import { type ReportModel, renderGapReportHtml } from "./report-html";
import { parseStoredFlags } from "./scoring";

export const LEAD_REPORT_QUEUE = "lead-report.generate";

export interface LeadReportJobPayload {
  tenantId: string;
  businessId: string;
  scanResultId?: string | null;
  requestedBy?: string | null;
}

export interface ReportStorage {
  download: (key: string) => Promise<Buffer>;
  upload: (key: string, body: Buffer, contentType: string) => Promise<void>;
}

export class ReportNotFoundError extends Error {
  constructor() {
    super("Business or scan result not found");
    this.name = "ReportNotFoundError";
  }
}

export async function buildReportModel(
  db: LeadFinderDb,
  tenantId: string,
  businessId: string,
  storage: Pick<ReportStorage, "download">,
  scanResultId?: string | null,
): Promise<{ model: ReportModel; scanResultId: string; rubricVersion: string }> {
  const detail = await getBusinessDetail(db, tenantId, businessId);
  if (!detail) throw new ReportNotFoundError();
  const result = await getScanResultForBusiness(db, tenantId, businessId, scanResultId);
  if (!result) throw new ReportNotFoundError();
  const branding = await getBranding(db, tenantId);

  let logoDataUri: string | null = null;
  if (branding?.logoStorageKey && isTenantStorageKey(tenantId, branding.logoStorageKey)) {
    try {
      logoDataUri = toDataUri(await storage.download(branding.logoStorageKey));
    } catch (error) {
      console.warn("[lead-report] logo could not be loaded; rendering without it", {
        tenantId,
        error,
      });
    }
  }

  const b = detail.business;
  const model: ReportModel = {
    branding: {
      companyName: branding?.companyName ?? null,
      logoDataUri,
      primaryColor: branding?.primaryColor ?? null,
      accentColor: branding?.accentColor ?? null,
      ctaHeadline: branding?.ctaHeadline ?? null,
      ctaBody: branding?.ctaBody ?? null,
      ctaUrl: branding?.ctaUrl ?? null,
      contactEmail: branding?.contactEmail ?? null,
      contactPhone: branding?.contactPhone ?? null,
      website: branding?.website ?? null,
      physicalAddress: branding?.physicalAddress ?? null,
    },
    business: {
      name: b.name,
      mainCategory: b.mainCategory,
      address: b.address,
      phone: b.phoneRaw ?? b.phoneE164,
    },
    score: result.score,
    flags: parseStoredFlags(result.flags),
    facts: { reviewCount: b.reviewCount, rating: b.rating, imageCount: b.imageCount },
    captureDate: new Date(result.createdAt),
    rubricVersion: result.rubricVersion,
  };
  return { model, scanResultId: result.id, rubricVersion: result.rubricVersion };
}

export async function renderReportPreviewHtml(
  db: LeadFinderDb,
  tenantId: string,
  businessId: string,
  storage: Pick<ReportStorage, "download">,
  scanResultId?: string | null,
): Promise<string> {
  const { model } = await buildReportModel(db, tenantId, businessId, storage, scanResultId);
  return renderGapReportHtml(model);
}

export function reportStorageKey(tenantId: string, businessId: string, reportId: string): string {
  return `${tenantStoragePrefix(tenantId)}lead-reports/${businessId}/${reportId}.pdf`;
}

/**
 * Worker job: render the PDF, store it under the tenant prefix, record it, and
 * move the deal forward to "Report Ready" (never backward).
 */
export async function generateReport(
  db: LeadFinderDb,
  payload: LeadReportJobPayload,
  deps: { storage: ReportStorage; renderPdf: (html: string) => Promise<{ pdf: Buffer }> },
) {
  const { tenantId, businessId } = payload;
  const { model, scanResultId, rubricVersion } = await buildReportModel(
    db,
    tenantId,
    businessId,
    deps.storage,
    payload.scanResultId,
  );
  const { pdf } = await deps.renderPdf(renderGapReportHtml(model));
  const key = reportStorageKey(tenantId, businessId, randomUUID());
  await deps.storage.upload(key, pdf, "application/pdf");
  const report = await insertReport(db, tenantId, {
    businessId,
    scanResultId,
    storageKey: key,
    rubricVersion,
    generatedBy: payload.requestedBy ?? null,
  });
  const detail = await getBusinessDetail(db, tenantId, businessId);
  if (detail?.business.dealId) {
    const pipeline = await ensureProspectPipeline(db, tenantId);
    await advanceDealForward(db, {
      tenantId,
      dealId: detail.business.dealId,
      target: "report-ready",
      pipeline,
    });
  }
  return report;
}
