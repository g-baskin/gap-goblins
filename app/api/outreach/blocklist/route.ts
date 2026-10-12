import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { outreachBlocklist } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { escapeForPostgresLike } from "@/lib/security/input-validation";

const blocklistInputSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  reason: z.string().trim().max(500).optional().nullable(),
});

type AuthResult = { response: NextResponse } | { session: { user?: { role?: string | null } } };

function isAdmin(session: { user?: { role?: string | null } }) {
  return session.user?.role === "admin" || session.user?.role === "super_admin";
}

async function requireAdmin(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdmin(session)) {
    return {
      response: NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 }),
    };
  }
  return { session };
}

function toResponseEntry(entry: typeof outreachBlocklist.$inferSelect) {
  return {
    id: entry.id,
    email: entry.email,
    reason: entry.reason,
    created_at: entry.createdAt,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 100), 200);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);

    const whereClause = search
      ? or(
          ilike(outreachBlocklist.email, `%${escapeForPostgresLike(search)}%`),
          ilike(outreachBlocklist.reason, `%${escapeForPostgresLike(search)}%`),
        )
      : undefined;

    const [entries, [{ count }]] = await Promise.all([
      db
        .select()
        .from(outreachBlocklist)
        .where(whereClause)
        .orderBy(desc(outreachBlocklist.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(outreachBlocklist).where(whereClause),
    ]);

    return NextResponse.json({
      entries: entries.map(toResponseEntry),
      total: count ?? entries.length,
    });
  } catch (error) {
    logger.error("Failed to load outreach blocklist:", error);
    return NextResponse.json({ error: "Failed to load blocklist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = blocklistInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const now = new Date().toISOString();

    const [entry] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.email}, 0))`);

      const [existing] = await tx
        .select()
        .from(outreachBlocklist)
        .where(eq(sql`lower(${outreachBlocklist.email})`, input.email))
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(outreachBlocklist)
          .set({ reason: input.reason || existing.reason })
          .where(eq(outreachBlocklist.id, existing.id))
          .returning();
        return [updated];
      }

      const [created] = await tx
        .insert(outreachBlocklist)
        .values({ email: input.email, reason: input.reason || null, createdAt: now })
        .returning();
      return [created];
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to add blocklist entry" }, { status: 500 });
    }

    return NextResponse.json({ entry: toResponseEntry(entry) }, { status: 201 });
  } catch (error) {
    logger.error("Failed to add outreach blocklist entry:", error);
    return NextResponse.json({ error: "Failed to add blocklist entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if ("response" in authResult) return authResult.response;

  try {
    const id = request.nextUrl.searchParams.get("id")?.trim();
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!id && !email) {
      return NextResponse.json({ error: "id or email is required" }, { status: 400 });
    }

    const whereClause = id
      ? eq(outreachBlocklist.id, id)
      : and(eq(sql`lower(${outreachBlocklist.email})`, email));

    const deleted = await db
      .delete(outreachBlocklist)
      .where(whereClause)
      .returning({ id: outreachBlocklist.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Blocklist entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to remove outreach blocklist entry:", error);
    return NextResponse.json({ error: "Failed to remove blocklist entry" }, { status: 500 });
  }
}
