import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { stopEnrollment } from "@/lib/automation/enrollments";
import { verifyAutomationUnsubscribeToken } from "@/lib/automation/unsubscribe";
import { automationEnrollments, newsletterSubscribers } from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  return unsubscribe(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  return unsubscribe(request, params);
}

async function unsubscribe(
  request: NextRequest,
  params: Promise<{ enrollmentId: string }>,
): Promise<Response> {
  try {
    const { enrollmentId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    if (!verifyAutomationUnsubscribeToken(enrollmentId, token)) {
      return Response.json({ error: "Invalid unsubscribe token" }, { status: 403 });
    }
    const [enrollment] = await db
      .select()
      .from(automationEnrollments)
      .where(eq(automationEnrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment) {
      return Response.json({ error: "Automation enrollment not found" }, { status: 404 });
    }

    await stopEnrollment(enrollment.id, "one_click_unsubscribe", "unsubscribed");

    if (enrollment.subscriberId) {
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribed: true, unsubscribedAt: new Date().toISOString() })
        .where(eq(newsletterSubscribers.id, enrollment.subscriberId));
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Automation unsubscribe failed:", error);
    return Response.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
