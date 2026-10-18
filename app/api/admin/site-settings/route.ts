import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, "default"))
      .limit(1);

    return NextResponse.json({ settings: row ?? null });
  } catch (error) {
    logger.error("Site settings fetch error:", error);
    return NextResponse.json({ error: "Failed to load site settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    // logoUrl is server-issued by upload/logo, never assigned by settings JSON.
    const optionalTextFields = [
      "businessName",
      "abn",
      "phone",
      "email",
      "addressStreet",
      "addressCity",
      "addressState",
      "addressPostcode",
      "addressCountry",
      "website",
    ] as const;

    const values: Partial<typeof siteSettings.$inferInsert> = { id: "default", updatedAt: now };
    const updates: Partial<typeof siteSettings.$inferInsert> = { updatedAt: now };

    for (const field of optionalTextFields) {
      if (Object.hasOwn(body, field)) {
        const value = typeof body[field] === "string" ? body[field] : null;
        values[field] = value;
        updates[field] = value;
      }
    }

    await db
      .insert(siteSettings)
      .values(values as typeof siteSettings.$inferInsert)
      .onConflictDoUpdate({
        target: siteSettings.id,
        set: updates,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Site settings save error:", error);
    return NextResponse.json({ error: "Failed to save site settings" }, { status: 500 });
  }
}
