import { ScanDetail } from "@/components/lead-finder/ScanDetail";
import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";

export default async function LeadScanPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <ScanDetail tenants={tenants} scanId={scanId} />;
}
