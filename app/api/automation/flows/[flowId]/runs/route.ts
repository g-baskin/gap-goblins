import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { automationEnrollments, automationFlows, automationNodeRuns } from "@/lib/db/schema";
import { requireAutomationTenant } from "../../../_lib";

export async function GET(request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  const { flowId } = await params;
  const rows = await db
    .select({ enrollment: automationEnrollments, run: automationNodeRuns })
    .from(automationEnrollments)
    .innerJoin(
      automationFlows,
      and(
        eq(automationFlows.id, automationEnrollments.flowId),
        eq(automationFlows.tenantId, auth.tenant.tenantId),
      ),
    )
    .leftJoin(
      automationNodeRuns,
      and(
        eq(automationNodeRuns.enrollmentId, automationEnrollments.id),
        eq(automationNodeRuns.tenantId, auth.tenant.tenantId),
      ),
    )
    .where(
      and(
        eq(automationEnrollments.tenantId, auth.tenant.tenantId),
        eq(automationEnrollments.flowId, flowId),
      ),
    )
    .orderBy(desc(automationEnrollments.createdAt), desc(automationNodeRuns.createdAt))
    .limit(500);
  return Response.json({ runs: rows });
}
