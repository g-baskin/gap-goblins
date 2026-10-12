import type { NextRequest } from "next/server";
import {
  archiveAutomationFlow,
  getAutomationFlow,
  updateAutomationFlow,
} from "@/lib/automation/flows";
import { getAutomationFlowStats } from "@/lib/automation/stats";
import { listAutomationSteps } from "@/lib/automation/steps";
import { logger } from "@/lib/logger";
import { updateAutomationFlowSchema } from "@/lib/validations/automation";
import { parseJson, requireAutomationTenant, validationError } from "../../_lib";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { flowId } = await params;
    const flow = await getAutomationFlow(flowId, authResult.tenant.tenantId);
    if (!flow) {
      return Response.json({ error: "Automation flow not found" }, { status: 404 });
    }

    const [steps, stats] = await Promise.all([
      listAutomationSteps(flowId),
      getAutomationFlowStats(flowId),
    ]);
    return Response.json({ flow, steps, stats }, { status: 200 });
  } catch (error) {
    logger.error("Error fetching automation flow:", error);
    return Response.json({ error: "Failed to fetch automation flow" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  const body = await parseJson(request);
  if (body instanceof Response) return body;

  const parsed = updateAutomationFlowSchema.safeParse(body.data);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  try {
    const { flowId } = await params;
    const flow = await updateAutomationFlow(flowId, authResult.tenant.tenantId, parsed.data);
    if (!flow) {
      return Response.json({ error: "Automation flow not found" }, { status: 404 });
    }
    return Response.json({ flow }, { status: 200 });
  } catch (error) {
    logger.error("Error updating automation flow:", error);
    return Response.json({ error: "Failed to update automation flow" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  try {
    const { flowId } = await params;
    const flow = await archiveAutomationFlow(flowId, authResult.tenant.tenantId);
    if (!flow) {
      return Response.json({ error: "Automation flow not found" }, { status: 404 });
    }
    return Response.json({ flow }, { status: 200 });
  } catch (error) {
    logger.error("Error archiving automation flow:", error);
    return Response.json({ error: "Failed to archive automation flow" }, { status: 500 });
  }
}
