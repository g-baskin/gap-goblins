import { and, eq } from "drizzle-orm";
import { adminUsers, tenantMemberships, tenants } from "../lib/db/schema";
import { closeWorkerDb, db } from "../lib/db/worker";

function requiredFlag(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Missing required --${name}`);
  return value;
}

async function main() {
  const slug = requiredFlag("slug").trim().toLowerCase();
  const name = requiredFlag("name").trim();
  const adminUserId = requiredFlag("admin-user-id");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid tenant slug");
  if (!name) throw new Error("Tenant name cannot be empty");

  await db.transaction(async (tx) => {
    const [admin] = await tx
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(and(eq(adminUsers.id, adminUserId), eq(adminUsers.isActive, true)))
      .limit(1);
    if (!admin) throw new Error("Active admin user not found");

    const [tenant] = await tx.insert(tenants).values({ slug, name }).returning({ id: tenants.id });
    if (!tenant) throw new Error("Tenant creation failed");

    await tx.insert(tenantMemberships).values({
      tenantId: tenant.id,
      userId: admin.id,
      role: "owner",
      status: "active",
    });
    console.log(JSON.stringify({ tenantId: tenant.id, slug, adminUserId: admin.id }));
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Tenant creation failed");
    process.exitCode = 1;
  })
  .finally(closeWorkerDb);
