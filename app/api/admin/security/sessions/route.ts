import { and, desc, eq, gt } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminAuditLog, adminSessions, adminUsers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

// GET - List active sessions
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.userId, session.user.id),
          gt(adminSessions.expiresAt, new Date().toISOString()),
        ),
      )
      .orderBy(desc(adminSessions.lastActivityAt));

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch active sessions from database",
        message: error instanceof Error ? error.message : String(error),
        details: "Could not load session list. Please try refreshing.",
      },
      { status: 500 },
    );
  }
}

// DELETE - Revoke a session
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per 15 minutes per user
  const rateLimitResult = await checkRateLimit(
    `session-revoke:${session.user.id}`,
    rateLimiters.login,
    "login",
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many session revocation requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("id");
  const revokeAll = searchParams.get("all") === "true";

  if (!sessionId && !revokeAll) {
    return NextResponse.json(
      { error: "Session ID is required unless all=true is provided" },
      { status: 400 },
    );
  }

  try {
    const now = new Date().toISOString();

    // JWT sessions cannot be individually revoked unless each token is denylisted.
    // Moving tokensValidFrom forward invalidates all already-issued JWT cookies for this user.
    await db
      .update(adminUsers)
      .set({ tokensValidFrom: now, updatedAt: now })
      .where(eq(adminUsers.id, session.user.id));

    if (sessionId) {
      await db
        .delete(adminSessions)
        .where(and(eq(adminSessions.id, sessionId), eq(adminSessions.userId, session.user.id)));
    } else {
      await db.delete(adminSessions).where(eq(adminSessions.userId, session.user.id));
    }

    // Log the action
    try {
      await db.insert(adminAuditLog).values({
        userId: session.user.id,
        action: revokeAll ? "revoke_all_sessions" : "revoke_session",
        resourceType: "session",
        resourceId: sessionId,
      });
    } catch (auditErr) {
      logger.warn("Failed to write audit log", {
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        action: "revoke_session",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to revoke session",
        message: error instanceof Error ? error.message : String(error),
        details: "Could not revoke the session. Please try again.",
      },
      { status: 500 },
    );
  }
}
