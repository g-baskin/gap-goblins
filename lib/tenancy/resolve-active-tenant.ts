import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantMemberships, tenants } from "@/lib/db/schema";

export type ActiveTenant = {
  tenantId: string;
  role: string;
};

export class TenantResolutionError extends Error {
  constructor(
    readonly code: "NO_ACTIVE_TENANT" | "TENANT_REQUIRED" | "TENANT_FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "TenantResolutionError";
  }
}

export async function listAvailableTenants(userId: string) {
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      role: tenantMemberships.role,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.status, "active"),
        eq(tenants.status, "active"),
      ),
    );
}

export async function resolveActiveTenant(
  userId: string,
  requestedTenantId?: string | null,
): Promise<ActiveTenant> {
  const memberships = await db
    .select({ tenantId: tenantMemberships.tenantId, role: tenantMemberships.role })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenantMemberships.userId, userId),
        eq(tenantMemberships.status, "active"),
        eq(tenants.status, "active"),
      ),
    );

  if (memberships.length === 0) {
    throw new TenantResolutionError("NO_ACTIVE_TENANT", "No active tenant membership");
  }

  if (requestedTenantId) {
    const selected = memberships.find((membership) => membership.tenantId === requestedTenantId);
    if (!selected) {
      throw new TenantResolutionError("TENANT_FORBIDDEN", "Tenant membership not found");
    }
    return selected;
  }

  if (memberships.length !== 1) {
    throw new TenantResolutionError("TENANT_REQUIRED", "Select an active tenant");
  }

  return memberships[0];
}

export function tenantResolutionResponse(error: unknown): Response | null {
  if (!(error instanceof TenantResolutionError)) return null;
  const status = error.code === "TENANT_REQUIRED" ? 400 : 403;
  return Response.json({ error: error.message, code: error.code }, { status });
}
