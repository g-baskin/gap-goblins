import { getRegisteredActionCatalog } from "@/lib/automation/actions/registry.server";
import { requireAutomationTenant } from "../_lib";

export async function GET(request: Request) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  return Response.json({ actions: getRegisteredActionCatalog() });
}
