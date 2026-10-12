import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminSettings, adminUsers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { parseBody, updateSettingsSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Allow either full settings update or just skinId
    const body = await request.json();

    // Skin-only update (from SkinPicker)
    if (body.skinId !== undefined && Object.keys(body).length === 1) {
      await db
        .insert(adminSettings)
        .values({
          userId: session.user.id,
          skinId: body.skinId,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: adminSettings.userId,
          set: { skinId: body.skinId, updatedAt: new Date().toISOString() },
        });
      return NextResponse.json({ success: true });
    }

    // Preferences-only update (from Appearance theme save)
    if (
      body.preferences !== undefined &&
      typeof body.preferences === "object" &&
      Object.keys(body).length === 1
    ) {
      const theme = body.preferences.theme;
      if (!theme || !["light", "dark", "system"].includes(theme)) {
        return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
      }

      const now = new Date().toISOString();
      await db
        .insert(adminSettings)
        .values({
          userId: session.user.id,
          theme,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: adminSettings.userId,
          set: { theme, updatedAt: now },
        });
      return NextResponse.json({ success: true });
    }

    const parsed = await parseBody({ json: async () => body } as NextRequest, updateSettingsSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const rawBody = body as Record<string, unknown>;
    const { profileSettings, notifications, preferences } = parsed.data;
    const skinId = typeof rawBody.skinId === "string" ? rawBody.skinId : undefined;
    const avatarUrl = rawBody.avatarUrl as string | null | undefined;
    const hasProfileSettings = rawBody.profileSettings !== undefined;
    const hasNotifications = rawBody.notifications !== undefined;
    const hasPreferences = rawBody.preferences !== undefined;

    if (hasProfileSettings || avatarUrl !== undefined) {
      const fullName = `${profileSettings.firstName} ${profileSettings.lastName}`.trim();
      try {
        await db
          .update(adminUsers)
          .set({
            ...(hasProfileSettings ? { name: fullName, jobTitle: profileSettings.jobTitle } : {}),
            ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(adminUsers.id, session.user.id));
      } catch (userError) {
        logger.error("Failed to update admin_users:", userError);
        return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
      }
    }

    if (hasPreferences || hasNotifications || skinId !== undefined) {
      try {
        const now = new Date().toISOString();
        const insertData = {
          userId: session.user.id,
          ...(hasPreferences
            ? {
                theme: preferences.theme,
                language: preferences.language,
                timezone: preferences.timezone,
              }
            : {}),
          ...(hasNotifications
            ? {
                notificationEmail: notifications.notificationEmail,
                notifyNewContact: notifications.newContact,
                notifyNewSubscriber: notifications.newSubscriber,
              }
            : {}),
          ...(skinId !== undefined ? { skinId } : {}),
          updatedAt: now,
        };
        const updateData = { ...insertData };
        delete (updateData as Partial<typeof insertData>).userId;

        await db
          .insert(adminSettings)
          .values(insertData)
          .onConflictDoUpdate({ target: adminSettings.userId, set: updateData });
      } catch (settingsError) {
        logger.error("Failed to save admin_settings:", settingsError);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Settings save error:", error);
    return NextResponse.json({ error: "Unexpected error saving settings" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [user] = await db
      .select({
        name: adminUsers.name,
        jobTitle: adminUsers.jobTitle,
        avatarUrl: adminUsers.avatarUrl,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, session.user.id))
      .limit(1);

    const [settings] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.userId, session.user.id))
      .limit(1);

    const nameParts = (user?.name || "").split(" ");

    return NextResponse.json({
      profile: {
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        jobTitle: user?.jobTitle || "",
        avatarUrl: user?.avatarUrl || null,
      },
      preferences: {
        theme: settings?.theme || "system",
        language: settings?.language || "en-AU",
        timezone: settings?.timezone || "Australia/Perth",
      },
      notifications: {
        notificationEmail: settings?.notificationEmail || session.user.email || "",
        newContact: settings?.notifyNewContact ?? true,
        newSubscriber: settings?.notifyNewSubscriber ?? true,
      },
      skinId: settings?.skinId || "concrete",
    });
  } catch (error) {
    logger.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Unexpected error loading settings" }, { status: 500 });
  }
}
