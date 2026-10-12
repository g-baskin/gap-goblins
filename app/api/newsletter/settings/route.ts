import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { newsletterSettings } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

const brandingSchema = z.object({
  logo: z.string().trim().default(""),
  primaryColor: z.string().trim().default("#3B82F6"),
  secondaryColor: z.string().trim().default("#8B5CF6"),
  fontFamily: z.string().trim().default("Inter, sans-serif"),
  formTitle: z.string().trim().default("Join the newsletter"),
  formDescription: z
    .string()
    .trim()
    .default("Get practical systems ideas and examples in your inbox."),
  buttonText: z.string().trim().default("Subscribe"),
  successMessage: z.string().trim().default("Thanks for subscribing. You're on the list."),
  consentText: z
    .string()
    .trim()
    .default("I agree to receive newsletter emails and can unsubscribe at any time."),
});

const senderSchema = z.object({
  name: z
    .string()
    .trim()
    .default(process.env.NEWSLETTER_DEFAULT_SENDER_NAME || "Newsletter"),
  email: z.string().trim().default("newsletter@email.__YOUR_DOMAIN__"),
  replyTo: z
    .string()
    .trim()
    .default(process.env.NEWSLETTER_DEFAULT_REPLY_TO || "noreply@example.com"),
});

const footerSchema = z.object({
  companyName: z.string().trim().default("Newsletter"),
  address: z.string().trim().default("Australian Business"),
  unsubscribeText: z.string().trim().default("Unsubscribe from this newsletter"),
});

const newsletterSettingsSchema = z.object({
  branding: brandingSchema.prefault({}),
  sender: senderSchema.prefault({}),
  template: z.string().trim().default("curated-brief"),
  footer: footerSchema.prefault({}),
});

type NewsletterSettings = z.infer<typeof newsletterSettingsSchema>;

const defaultSettings = newsletterSettingsSchema.parse({});

function normalizeSettings(input: unknown): NewsletterSettings {
  return newsletterSettingsSchema.parse(input ?? {});
}

function publicSettings(settings: NewsletterSettings) {
  return {
    branding: settings.branding,
    footer: {
      companyName: settings.footer.companyName,
      address: settings.footer.address,
      unsubscribeText: settings.footer.unsubscribeText,
    },
  };
}

function isAdminSession(session: { user?: { role?: string | null } } | null) {
  return session?.user?.role === "admin" || session?.user?.role === "super_admin";
}

/**
 * GET /api/newsletter/settings
 * Retrieve current newsletter settings
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const publicOnly = request.nextUrl.searchParams.get("public") === "1";
    const session = await auth();

    if (!publicOnly) {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!isAdminSession(session)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const [settingsData] = await db.select().from(newsletterSettings).limit(1);
    const settings = settingsData
      ? normalizeSettings({
          branding: settingsData.branding,
          sender: settingsData.sender,
          template: settingsData.template,
          footer: settingsData.footer,
        })
      : defaultSettings;

    return NextResponse.json(publicOnly ? publicSettings(settings) : settings);
  } catch (error) {
    logger.error("Error fetching settings:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch newsletter settings from database",
        message: error instanceof Error ? error.message : "Unknown database error",
        details: "Could not load newsletter settings. Please try refreshing.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/newsletter/settings
 * Update newsletter settings
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    let rawSettings: unknown;
    try {
      rawSettings = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = newsletterSettingsSchema.safeParse(rawSettings);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const settings = parsed.data;

    // NOTE: sender.email is display-only. Actual delivery sender configuration
    // lives in Settings → Integrations → Resend, but we still validate this UI
    // field when a real address is saved.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.sender.email) || !emailRegex.test(settings.sender.replyTo)) {
      return NextResponse.json(
        { error: "Invalid email addresses in sender configuration" },
        { status: 400 },
      );
    }

    // Check if settings already exist
    const [existing] = await db
      .select({ id: newsletterSettings.id })
      .from(newsletterSettings)
      .limit(1);

    if (existing) {
      // Update existing settings
      await db
        .update(newsletterSettings)
        .set({
          branding: settings.branding,
          sender: settings.sender,
          template: settings.template,
          footer: settings.footer,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(newsletterSettings.id, existing.id));
    } else {
      // Insert new settings
      await db.insert(newsletterSettings).values({
        branding: settings.branding,
        sender: settings.sender,
        template: settings.template,
        footer: settings.footer,
      });
    }

    return NextResponse.json({
      message: "Settings saved successfully",
      settings,
    });
  } catch (error) {
    logger.error("Error saving settings:", error);
    return NextResponse.json(
      {
        error: "Failed to save newsletter settings to database",
        message: error instanceof Error ? error.message : "Unknown database error",
        details: "Could not save settings. Please try again.",
      },
      { status: 500 },
    );
  }
}
