import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";
import { AutomationDashboard } from "./components/AutomationDashboard";

export default async function AutomationPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <AutomationDashboard tenants={tenants} />;
}
