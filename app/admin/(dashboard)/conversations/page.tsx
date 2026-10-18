import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";
import { ConversationsWorkspace } from "./conversations-workspace";

export const metadata: Metadata = {
  title: "Conversations | Admin",
};

export default async function ConversationsPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <ConversationsWorkspace tenants={tenants} />;
}
