import { type NextRequest, NextResponse } from "next/server";
import { compareBearerToken } from "@/lib/auth/compare-api-keys";
import { logger } from "@/lib/logger";
import { generateDealStallNudges } from "@/lib/nudges/deal-stall";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Cron job not configured" }, { status: 500 });
    }

    if (!authHeader || !compareBearerToken(authHeader, cronSecret)) {
      logger.warn("Unauthorized deal-stall nudge cron attempt", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting deal-stall nudge generation");
    const result = await generateDealStallNudges();
    logger.info("Deal-stall nudge generation complete", result);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Deal-stall nudge cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate deal-stall nudges",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization",
      },
    },
  );
}
