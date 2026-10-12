import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines, stages } from "@/lib/db/schema";
import { requireAutomationTenant } from "../_lib";

export async function GET(request: Request) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  const rows = await db
    .select({
      pipelineId: pipelines.id,
      pipelineName: pipelines.name,
      stageId: stages.id,
      stageName: stages.name,
      stageOrder: stages.displayOrder,
    })
    .from(pipelines)
    .innerJoin(
      stages,
      and(eq(stages.pipelineId, pipelines.id), eq(stages.tenantId, auth.tenant.tenantId)),
    )
    .where(eq(pipelines.tenantId, auth.tenant.tenantId))
    .orderBy(asc(pipelines.name), asc(stages.displayOrder));
  return Response.json({ options: rows });
}
