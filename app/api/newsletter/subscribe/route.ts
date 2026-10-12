import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

const subscribeSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  businessName: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(120).optional(),
  source: z.string().trim().max(120).optional(),
  referrer: z.string().trim().max(500).optional(),
  consent: z.literal(true),
});

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || null;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const now = new Date().toISOString();
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get("user-agent");

    const [subscriber] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.email}, 0))`);

      const [existing] = await tx
        .select()
        .from(newsletterSubscribers)
        .where(eq(sql`lower(${newsletterSubscribers.email})`, input.email))
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(newsletterSubscribers)
          .set({
            firstName: input.firstName || existing.firstName,
            lastName: input.lastName || existing.lastName,
            businessName: input.businessName || existing.businessName,
            industry: input.industry || existing.industry,
            source: input.source || existing.source || "subscribe_form",
            referrer: input.referrer || existing.referrer,
            unsubscribed: false,
            unsubscribedAt: null,
            consentGivenAt: existing.consentGivenAt || now,
            consentIpAddress: existing.consentIpAddress || ipAddress,
            consentUserAgent: existing.consentUserAgent || userAgent,
            verified: true,
            verifiedAt: existing.verifiedAt || now,
            verificationToken: null,
            verificationTokenExpiresAt: null,
            updatedAt: now,
          })
          .where(eq(newsletterSubscribers.id, existing.id))
          .returning({
            id: newsletterSubscribers.id,
            email: newsletterSubscribers.email,
            verified: newsletterSubscribers.verified,
          });
        return [updated];
      }

      const [created] = await tx
        .insert(newsletterSubscribers)
        .values({
          email: input.email,
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          businessName: input.businessName || null,
          industry: input.industry || null,
          source: input.source || "subscribe_form",
          referrer: input.referrer || null,
          unsubscribed: false,
          verified: true,
          verifiedAt: now,
          consentGivenAt: now,
          consentIpAddress: ipAddress,
          consentUserAgent: userAgent,
          verificationToken: null,
          verificationTokenExpiresAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: newsletterSubscribers.id,
          email: newsletterSubscribers.email,
          verified: newsletterSubscribers.verified,
        });

      return [created];
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        subscriber: {
          id: subscriber.id,
          email: subscriber.email,
          verified: subscriber.verified,
        },
        verificationRequired: false,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const [subscriber] = await db
      .update(newsletterSubscribers)
      .set({
        verified: true,
        verifiedAt: now,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        unsubscribed: false,
        unsubscribedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(newsletterSubscribers.verificationToken, token),
          eq(newsletterSubscribers.verified, false),
          sql`${newsletterSubscribers.verificationTokenExpiresAt} > now()`,
        ),
      )
      .returning({ id: newsletterSubscribers.id, email: newsletterSubscribers.email });

    if (!subscriber) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    logger.error("Newsletter verification error:", error);
    return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 });
  }
}
