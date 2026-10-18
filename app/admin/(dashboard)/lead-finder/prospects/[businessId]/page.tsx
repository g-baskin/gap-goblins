import { ProspectDetail } from "@/components/lead-finder/ProspectDetail";
import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <ProspectDetail tenants={tenants} businessId={businessId} />;
}
