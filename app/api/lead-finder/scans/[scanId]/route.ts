import { db } from "@/lib/db";
import { cancelScan, getScan, listScanResults } from "@/lib/lead-finder/queries";
import { isUuid, notFound, requireLeadFinderTenant } from "../../_lib";

type Params = { params: Promise<{ scanId: string }> };

export async function GET(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { scanId } = await params;
  if (!isUuid(scanId)) return notFound("Scan not found");
  const tenantId = authResult.tenant.tenantId;
  const scan = await getScan(db, tenantId, scanId);
  if (!scan) return notFound("Scan not found");
  const results = await listScanResults(db, tenantId, scanId);
  return Response.json({ scan, results });
}

/** Cancels a queued or running scan. */
export async function DELETE(request: Request, { params }: Params) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const { scanId } = await params;
  if (!isUuid(scanId)) return notFound("Scan not found");
  const tenantId = authResult.tenant.tenantId;
  const scan = await getScan(db, tenantId, scanId);
  if (!scan) return notFound("Scan not found");
  const cancelled = await cancelScan(db, tenantId, scanId);
  if (!cancelled) return Response.json({ error: "Scan already finished" }, { status: 409 });
  return Response.json({ ok: true });
}
