import { LeadFinderHome } from "@/components/lead-finder/LeadFinderHome";
import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";

export default async function LeadFinderPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <LeadFinderHome tenants={tenants} />;
}
