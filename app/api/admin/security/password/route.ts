import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminAuditLog, adminUsers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";
import { changePasswordSchema, parseBody, sanitizeError } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 requests per hour per user
  const rateLimitResult = await checkRateLimit(
    `password-change:${session.user.id}`,
    rateLimiters.passwordChange,
    "api",
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many password change requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        },
      },
    );
  }

  const parsed = await parseBody(request, changePasswordSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: passwordValidation.errors.join(", ") }, { status: 400 });
  }

  try {
    // Get current user
    const [user] = await db
      .select({ id: adminUsers.id, passwordHash: adminUsers.passwordHash })
      .from(adminUsers)
      .where(eq(adminUsers.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    const now = new Date().toISOString();

    // Update password and invalidate existing JWT sessions.
    await db
      .update(adminUsers)
      .set({
        passwordHash: newPasswordHash,
        passwordChangedAt: now,
        tokensValidFrom: now,
        updatedAt: now,
      })
      .where(eq(adminUsers.id, session.user.id));

    // Log the action
    try {
      await db.insert(adminAuditLog).values({
        userId: session.user.id,
        action: "change_password",
        resourceType: "user",
        resourceId: session.user.id,
      });
    } catch (auditErr) {
      logger.warn("Failed to write audit log", {
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        action: "change_password",
      });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError({ message: error instanceof Error ? error.message : String(error) }) },
      { status: 500 },
    );
  }
}
