import { db } from "@/lib/db";
import { getBusinessDetail, getScanResultForBusiness } from "@/lib/lead-finder/queries";
import { logger } from "@/lib/logger";
import { enqueueLeadReport } from "@/lib/queue";
import { isUuid, notFound, requireLeadFinderTenant } from "../../../_lib";

type Params = { params: Promise<{ businessId: string }> };

/** Lists generated PDFs for the business (newest first). */
export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { businessId } = await params;
  if (!isUuid(businessId)) return notFound("Business not found");
  const detail = await getBusinessDetail(db, authResult.tenant.tenantId, businessId);
  if (!detail) return notFound("Business not found");
  return Response.json({ reports: detail.reports });
}

/** Queues PDF generation in the worker. */
export async function POST(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { businessId } = await params;
  if (!isUuid(businessId)) return notFound("Business not found");
  const tenantId = authResult.tenant.tenantId;
  const result = await getScanResultForBusiness(db, tenantId, businessId);
  if (!result) return notFound("Business not found");
  try {
    const jobId = await enqueueLeadReport({
      tenantId,
      businessId,
      scanResultId: result.id,
      requestedBy: authResult.userId,
    });
    return Response.json({ queued: true, jobId }, { status: 202 });
  } catch (error) {
    logger.error("Failed to enqueue lead report", error);
    return Response.json({ error: "Could not queue the report" }, { status: 503 });
  }
}
