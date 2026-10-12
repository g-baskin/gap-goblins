/**
 * Tags API endpoint for autocomplete
 * GET /api/outreach/campaigns/tags - Get all unique tags across campaigns
 */

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Get all unique tags for autocomplete
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await db.execute<{ tag: string }>(sql`
      SELECT DISTINCT lower(btrim(campaign_tag.tag)) AS tag
      FROM outreach_campaigns
      CROSS JOIN LATERAL unnest(outreach_campaigns.tags) AS campaign_tag(tag)
      WHERE btrim(campaign_tag.tag) <> ''
      ORDER BY tag
    `);

    const tags = (rows as unknown as { tag: string }[]).map((row) => row.tag);

    return NextResponse.json({ tags });
  } catch (error) {
    logger.error("Exception fetching tags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
