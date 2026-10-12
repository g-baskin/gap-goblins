import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CrmError } from "@/lib/crm/types";
import { logger } from "@/lib/logger";
import { snoozeHumanNudge } from "@/lib/nudges/human-nudges";
import { snoozeHumanNudgeSchema } from "@/lib/validations/nudges";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.role || !["admin", "super_admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  return { userId: session.user.id };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nudgeId: string }> },
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { nudgeId } = await context.params;
    const body = await request.json();
    const parsed = snoozeHumanNudgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const nudge = await snoozeHumanNudge(nudgeId, parsed.data.snoozedUntil);
    return NextResponse.json({ nudge });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (error instanceof CrmError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    logger.error("Error in nudge snooze API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
