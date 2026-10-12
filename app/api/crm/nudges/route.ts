import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CrmError } from "@/lib/crm/types";
import { logger } from "@/lib/logger";
import { createHumanNudge, listHumanNudges } from "@/lib/nudges/human-nudges";
import { createHumanNudgeSchema, listHumanNudgesSchema } from "@/lib/validations/nudges";

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const searchParams = request.nextUrl.searchParams;
    const parsed = listHumanNudgesSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      contactId: searchParams.get("contactId") ?? undefined,
      dealId: searchParams.get("dealId") ?? undefined,
      due: searchParams.get("due") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const result = await listHumanNudges(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CrmError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    logger.error("Error in nudges list API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = createHumanNudgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const nudge = await createHumanNudge({ ...parsed.data, createdBy: authResult.userId });
    return NextResponse.json({ nudge }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (error instanceof CrmError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    logger.error("Error in nudge create API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
