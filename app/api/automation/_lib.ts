import { auth } from "@/lib/auth";
import { resolveActiveTenant, tenantResolutionResponse } from "@/lib/tenancy/resolve-active-tenant";

export async function requireAutomationAdmin(): Promise<{ ok: true; userId: string } | Response> {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.role || !["admin", "super_admin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return { ok: true, userId: session.user.id };
}

export async function requireAutomationTenant(request: Request, adminOnly = false) {
  const session = await requireAutomationAdmin();
  if (session instanceof Response) return session;
  try {
    const tenant = await resolveActiveTenant(session.userId, request.headers.get("x-tenant-id"));
    if (adminOnly && !["owner", "admin"].includes(tenant.role)) {
      return Response.json({ error: "Tenant admin access required" }, { status: 403 });
    }
    return { ...session, tenant };
  } catch (error) {
    return (
      tenantResolutionResponse(error) ??
      Response.json({ error: "Tenant access denied" }, { status: 403 })
    );
  }
}

export async function parseJson(request: Request): Promise<{ ok: true; data: unknown } | Response> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
}

export function validationError(error: unknown): Response {
  return Response.json({ error: "Validation failed", details: error }, { status: 400 });
}
