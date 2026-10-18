import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";
import { MessagingSettings } from "./messaging-settings";

export default async function MessagingSettingsPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <MessagingSettings tenants={tenants} />;
}
