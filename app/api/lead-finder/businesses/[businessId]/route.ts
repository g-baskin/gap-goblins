import { db } from "@/lib/db";
import { getBusinessDetail } from "@/lib/lead-finder/queries";
import { isUuid, notFound, requireLeadFinderTenant } from "../../_lib";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { businessId } = await params;
  if (!isUuid(businessId)) return notFound("Business not found");
  const detail = await getBusinessDetail(db, authResult.tenant.tenantId, businessId);
  if (!detail) return notFound("Business not found");
  // The raw source payload stays server-side.
  const { rawPayload: _raw, ...business } = detail.business;
  return Response.json({ ...detail, business });
}
