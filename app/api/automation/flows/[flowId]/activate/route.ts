import type { NextRequest } from "next/server";
import { activateAutomationFlow } from "@/lib/automation/flows";
import { logger } from "@/lib/logger";
import { requireAutomationTenant } from "../../../_lib";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  try {
    const { flowId } = await params;
    const flow = await activateAutomationFlow(flowId, authResult.tenant.tenantId);
    if (!flow) {
      return Response.json({ error: "Automation flow not found" }, { status: 404 });
    }
    return Response.json({ flow }, { status: 200 });
  } catch (error) {
    logger.error("Error activating automation flow:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to activate automation flow" },
      { status: 400 },
    );
  }
}
