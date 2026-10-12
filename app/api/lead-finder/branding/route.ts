import { z } from "zod";
import { db } from "@/lib/db";
import { getBranding, upsertBranding } from "@/lib/lead-finder/queries";
import { requireLeadFinderTenant } from "../_lib";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1f2937")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    if (!v) return true;
    try {
      return ["http:", "https:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, "Use a full http(s) URL")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const brandingSchema = z.object({
  companyName: optionalText(120),
  primaryColor: hexColor,
  accentColor: hexColor,
  ctaHeadline: optionalText(120),
  ctaBody: optionalText(600),
  ctaUrl: httpUrl,
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .email("Enter a valid email")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  contactPhone: optionalText(40),
  website: httpUrl,
  physicalAddress: optionalText(300),
});

export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const branding = await getBranding(db, authResult.tenant.tenantId);
  return Response.json({ branding });
}

export async function PUT(request: Request) {
  const authResult = await requireLeadFinderTenant(request, true);
  if (authResult instanceof Response) return authResult;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
  const parsed = brandingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const branding = await upsertBranding(db, authResult.tenant.tenantId, {
    ...data,
    primaryColor: data.primaryColor ?? null,
    accentColor: data.accentColor ?? null,
    contactEmail: data.contactEmail ?? null,
  });
  return Response.json({ branding });
}
