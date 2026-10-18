import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { isTenantStorageKey, tenantStoragePrefix } from "@/lib/lead-finder/db";
import { LOGO_MAX_BYTES, LOGO_MIME, validateLogo } from "@/lib/lead-finder/image-validation";
import { getBranding, setBrandingLogo } from "@/lib/lead-finder/queries";
import { deleteFile } from "@/lib/storage";
import { notFound, requireLeadFinderTenant, webStorage } from "../../_lib";

/** Serves the tenant's own logo (for the settings preview). */
export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;
  const branding = await getBranding(db, tenantId);
  const key = branding?.logoStorageKey;
  if (!key || !isTenantStorageKey(tenantId, key)) return notFound("No logo");
  let bytes: Buffer;
  try {
    bytes = await webStorage.download(key);
  } catch {
    return notFound("No logo");
  }
  const check = validateLogo(bytes);
  if (!check.ok) return notFound("No logo");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": check.mime,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}

/** Uploads a PNG/JPEG/WebP logo (≤ 1 MB, checked by magic bytes; no SVG). */
export async function POST(request: Request) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });
  if (file.size > LOGO_MAX_BYTES) {
    return Response.json({ error: "Logo must be 1 MB or smaller" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const check = validateLogo(bytes);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const ext = Object.entries(LOGO_MIME).find(([, mime]) => mime === check.mime)?.[0] ?? "img";
  const key = `${tenantStoragePrefix(tenantId)}branding/logo-${randomUUID()}.${ext}`;
  await webStorage.upload(key, bytes, check.mime);
  const previous = await getBranding(db, tenantId);
  await setBrandingLogo(db, tenantId, key);
  if (previous?.logoStorageKey && isTenantStorageKey(tenantId, previous.logoStorageKey)) {
    await deleteFile(previous.logoStorageKey).catch(() => undefined);
  }
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;
  const previous = await getBranding(db, tenantId);
  await setBrandingLogo(db, tenantId, null);
  if (previous?.logoStorageKey && isTenantStorageKey(tenantId, previous.logoStorageKey)) {
    await deleteFile(previous.logoStorageKey).catch(() => undefined);
  }
  return Response.json({ ok: true });
}
