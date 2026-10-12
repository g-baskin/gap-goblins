import { db } from "@/lib/db";
import { isTenantStorageKey } from "@/lib/lead-finder/db";
import { getBusinessDetail, getReport } from "@/lib/lead-finder/queries";
import { isUuid, notFound, requireLeadFinderTenant, webStorage } from "../../../_lib";

type Params = { params: Promise<{ reportId: string }> };

function fileName(name: string) {
  const safe = name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `gap-report-${safe || "business"}.pdf`;
}

/** Streams a stored PDF after checking it belongs to the active tenant. */
export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { reportId } = await params;
  if (!isUuid(reportId)) return notFound("Report not found");
  const tenantId = authResult.tenant.tenantId;
  const report = await getReport(db, tenantId, reportId);
  if (!report || !isTenantStorageKey(tenantId, report.storageKey)) {
    return notFound("Report not found");
  }
  const detail = await getBusinessDetail(db, tenantId, report.businessId);
  let pdf: Buffer;
  try {
    pdf = await webStorage.download(report.storageKey);
  } catch {
    return notFound("Report file not found");
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName(detail?.business.name ?? "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
