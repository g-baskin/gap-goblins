import { getAutomationDashboardStats } from "@/lib/automation/stats";
import { logger } from "@/lib/logger";
import { requireAutomationTenant } from "../_lib";

export async function GET(request: Request) {
  const authResult = await requireAutomationTenant(request);
  if (authResult instanceof Response) return authResult;

  try {
    const stats = await getAutomationDashboardStats(authResult.tenant.tenantId);
    return Response.json({ stats }, { status: 200 });
  } catch (error) {
    logger.error("Error fetching automation stats:", error);
    return Response.json({ error: "Failed to fetch automation stats" }, { status: 500 });
  }
}
