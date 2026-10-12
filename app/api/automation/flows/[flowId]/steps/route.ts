import type { NextRequest } from "next/server";
import { getAutomationFlow } from "@/lib/automation/flows";
import { listAutomationSteps, replaceAutomationSteps } from "@/lib/automation/steps";
import { logger } from "@/lib/logger";
import { replaceAutomationStepsSchema } from "@/lib/validations/automation";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

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
    const steps = await listAutomationSteps(flowId);
    return Response.json({ steps }, { status: 200 });
  } catch (error) {
    logger.error("Error listing automation steps:", error);
    return Response.json({ error: "Failed to fetch automation steps" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  const body = await parseJson(request);
  if (body instanceof Response) return body;

  const parsed = replaceAutomationStepsSchema.safeParse(body.data);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  try {
    const { flowId } = await params;
    const flow = await getAutomationFlow(flowId, authResult.tenant.tenantId);
    if (!flow) {
      return Response.json({ error: "Automation flow not found" }, { status: 404 });
    }

    const steps = await replaceAutomationSteps(flowId, parsed.data.steps);
    return Response.json({ steps }, { status: 200 });
  } catch (error) {
    logger.error("Error replacing automation steps:", error);
    return Response.json({ error: "Failed to save automation steps" }, { status: 500 });
  }
}
