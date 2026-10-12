import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CrmError } from "@/lib/crm/types";
import { logger } from "@/lib/logger";
import { markHumanNudgeActed } from "@/lib/nudges/human-nudges";

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
  _request: NextRequest,
  context: { params: Promise<{ nudgeId: string }> },
) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { nudgeId } = await context.params;
    const nudge = await markHumanNudgeActed(nudgeId);
    return NextResponse.json({ nudge });
  } catch (error) {
    if (error instanceof CrmError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    logger.error("Error in nudge act API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
