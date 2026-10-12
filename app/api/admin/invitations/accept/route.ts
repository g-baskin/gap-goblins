import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminAuditLog, adminInvitations, adminUsers } from "@/lib/db/schema";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { checkRateLimit, getClientIp, rateLimiters } from "@/lib/rate-limit";
import { acceptInvitationSchema, parseBody, sanitizeError } from "@/lib/validations";

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per hour per IP (public endpoint protection)
  const clientIp = getClientIp(request);
  const rateLimitResult = await checkRateLimit(
    `invitation-accept:${clientIp}`,
    rateLimiters.invitationAccept,
    "api",
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many invitation acceptance requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        },
      },
    );
  }

  const parsed = await parseBody(request, acceptInvitationSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { token, name, password } = parsed.data;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: passwordValidation.errors.join(", ") }, { status: 400 });
  }

  // Hash the token to look it up
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const result = await db.transaction(async (tx) => {
      // Atomically claim one pending invitation so parallel accepts cannot create duplicates.
      const [invitation] = await tx
        .update(adminInvitations)
        .set({ status: "accepting" })
        .where(
          and(eq(adminInvitations.tokenHash, tokenHash), eq(adminInvitations.status, "pending")),
        )
        .returning();

      if (!invitation) {
        return { error: "Invalid or expired invitation", status: 400 as const };
      }

      const now = new Date().toISOString();

      // Check expiration
      if (new Date(invitation.expiresAt) < new Date()) {
        await tx
          .update(adminInvitations)
          .set({ status: "expired" })
          .where(eq(adminInvitations.id, invitation.id));

        return { error: "Invitation has expired", status: 400 as const };
      }

      const normalizedEmail = invitation.email.toLowerCase().trim();

      const [existingUser] = await tx
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        await tx
          .update(adminInvitations)
          .set({ status: "accepted", acceptedAt: now })
          .where(eq(adminInvitations.id, invitation.id));

        return { error: "An admin user with this email already exists", status: 409 as const };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [user] = await tx
        .insert(adminUsers)
        .values({
          email: normalizedEmail,
          name,
          passwordHash,
          role: invitation.role,
          isActive: true,
        })
        .returning();

      if (!user) {
        return { error: "Failed to create user", status: 500 as const };
      }

      // Update invitation status
      await tx
        .update(adminInvitations)
        .set({
          status: "accepted",
          acceptedAt: now,
        })
        .where(eq(adminInvitations.id, invitation.id));

      // Log the action
      await tx.insert(adminAuditLog).values({
        userId: user.id,
        action: "accept_invitation",
        resourceType: "user",
        resourceId: user.id,
        details: { invitation_id: invitation.id },
      });

      return { userId: user.id };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. You can now log in.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError({ message: error instanceof Error ? error.message : String(error) }) },
      { status: 500 },
    );
  }
}

// GET - Validate invitation token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Hash the token to look it up
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const [invitation] = await db
      .select({
        email: adminInvitations.email,
        role: adminInvitations.role,
        expiresAt: adminInvitations.expiresAt,
        status: adminInvitations.status,
      })
      .from(adminInvitations)
      .where(eq(adminInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: `Invitation is ${invitation.status}` }, { status: 400 });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeError({ message: error instanceof Error ? error.message : String(error) }) },
      { status: 500 },
    );
  }
}
