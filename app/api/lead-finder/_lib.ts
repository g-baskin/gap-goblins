import { auth } from "@/lib/auth";
import { downloadFile, uploadFile } from "@/lib/storage";
import { resolveActiveTenant, tenantResolutionResponse } from "@/lib/tenancy/resolve-active-tenant";

export type LeadFinderAuth = {
  ok: true;
  userId: string;
  tenant: { tenantId: string; role: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Resolves the signed-in admin and the active tenant. The tenant comes from the
 * `x-tenant-id` header, or `?tenantId=` for plain links (PDF download, preview
 * iframe). Either way it must be one of the user's active memberships.
 */
export async function requireLeadFinderTenant(
  request: Request,
  adminOnly = false,
): Promise<LeadFinderAuth | Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.role || !["admin", "super_admin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const requested =
    request.headers.get("x-tenant-id") ?? new URL(request.url).searchParams.get("tenantId");
  try {
    const tenant = await resolveActiveTenant(session.user.id, requested);
    if (adminOnly && !["owner", "admin"].includes(tenant.role)) {
      return Response.json({ error: "Tenant admin access required" }, { status: 403 });
    }
    return { ok: true, userId: session.user.id, tenant };
  } catch (error) {
    return (
      tenantResolutionResponse(error) ??
      Response.json({ error: "Tenant access denied" }, { status: 403 })
    );
  }
}

export function notFound(what = "Not found") {
  return Response.json({ error: what }, { status: 404 });
}

export const webStorage = {
  async download(key: string): Promise<Buffer> {
    const bytes = await downloadFile(key);
    if (!bytes) throw new Error("Storage object not found");
    return Buffer.from(bytes);
  },
  async upload(key: string, body: Buffer, contentType: string) {
    await uploadFile(key, body, { contentType });
  },
};
