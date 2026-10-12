import { BrandingSettings } from "@/components/lead-finder/BrandingSettings";
import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";

export default async function ReportBrandingPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <BrandingSettings tenants={tenants} />;
}
