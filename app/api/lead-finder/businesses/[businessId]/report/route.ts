import { db } from "@/lib/db";
import { REPORT_CSP } from "@/lib/lead-finder/report-html";
import { ReportNotFoundError, renderReportPreviewHtml } from "@/lib/lead-finder/report-service";
import { isUuid, notFound, requireLeadFinderTenant, webStorage } from "../../../_lib";

type Params = { params: Promise<{ businessId: string }> };

/**
 * HTML preview of the gap report (the same HTML the PDF is rendered from).
 * Served with a CSP that forbids scripts and network access; the in-app
 * preview loads it in a sandboxed iframe.
 */
export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { businessId } = await params;
  if (!isUuid(businessId)) return notFound("Business not found");
  const scanResultId = new URL(request.url).searchParams.get("scanResultId");
  try {
    const html = await renderReportPreviewHtml(
      db,
      authResult.tenant.tenantId,
      businessId,
      webStorage,
      isUuid(scanResultId) ? scanResultId : null,
    );
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": `${REPORT_CSP}; frame-ancestors 'self'`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReportNotFoundError) return notFound("Business not found");
    throw error;
  }
}
