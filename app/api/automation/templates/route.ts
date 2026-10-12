import { listWorkflowTemplates } from "@/lib/automation/graph/templates";
import { requireAutomationTenant } from "../_lib";

export async function GET(request: Request) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  return Response.json({ templates: await listWorkflowTemplates(auth.tenant.tenantId) });
}
