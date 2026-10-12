import { z } from "zod";

export {
  isUuid,
  notFound,
  requireLeadFinderTenant as requireTenant,
} from "@/app/api/lead-finder/_lib";

/** How the contact agreed to receive texts. Stored with the consent record. */
export const CONSENT_SOURCES = [
  "Contact texted us first",
  "Web form opt-in",
  "Signed paper form",
  "Verbal consent on a call",
  "Existing customer who gave their number for texts",
] as const;

export function isTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value.includes("/") || value === "UTC";
  } catch {
    return false;
  }
}

export const consentBodySchema = z.object({
  source: z.enum(CONSENT_SOURCES),
  timezone: z.string().min(1).max(64).refine(isTimezone, "Pick a valid timezone"),
});

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function badRequest(error: z.ZodError | string) {
  const message =
    typeof error === "string" ? error : (error.issues[0]?.message ?? "Invalid request");
  return Response.json({ error: message }, { status: 400 });
}
