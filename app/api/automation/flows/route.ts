import type { NextRequest } from "next/server";
import { createAutomationFlow, listAutomationFlows } from "@/lib/automation/flows";
import { logger } from "@/lib/logger";
import { createAutomationFlowSchema } from "@/lib/validations/automation";
import { parseJson, requireAutomationTenant, validationError } from "../_lib";

export async function GET(request: NextRequest) {
  const authResult = await requireAutomationTenant(request);
  if (authResult instanceof Response) return authResult;

  try {
    const flows = await listAutomationFlows(authResult.tenant.tenantId);
    return Response.json({ flows }, { status: 200 });
  } catch (error) {
    logger.error("Error listing automation flows:", error);
    return Response.json({ error: "Failed to fetch automation flows" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  const body = await parseJson(request);
  if (body instanceof Response) return body;

  const parsed = createAutomationFlowSchema.safeParse(body.data);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  try {
    const flow = await createAutomationFlow(
      parsed.data,
      authResult.userId,
      authResult.tenant.tenantId,
    );
    return Response.json({ flow }, { status: 201 });
  } catch (error) {
    logger.error("Error creating automation flow:", error);
    return Response.json({ error: "Failed to create automation flow" }, { status: 500 });
  }
}
