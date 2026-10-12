/**
 * Seed the default sales pipeline and stages (idempotent).
 *
 * Usage: bun --env-file=.env.local scripts/seed-crm-pipeline.ts
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pipelines, stages } from "../lib/db/schema";

const PIPELINE_SLUG = "sales-pipeline";

const STAGE_DEFINITIONS = [
  {
    name: "Lead",
    slug: "lead",
    displayOrder: 1,
    color: "#6366f1",
    isTerminal: false,
    isPositive: false,
  },
  {
    name: "Contacted",
    slug: "contacted",
    displayOrder: 2,
    color: "#3b82f6",
    isTerminal: false,
    isPositive: false,
  },
  {
    name: "Meeting Booked",
    slug: "meeting-booked",
    displayOrder: 3,
    color: "#8b5cf6",
    isTerminal: false,
    isPositive: false,
  },
  {
    name: "Proposal Sent",
    slug: "proposal-sent",
    displayOrder: 4,
    color: "#f59e0b",
    isTerminal: false,
    isPositive: false,
  },
  {
    name: "Won",
    slug: "won",
    displayOrder: 5,
    color: "#22c55e",
    isTerminal: true,
    isPositive: true,
  },
  {
    name: "Lost",
    slug: "lost",
    displayOrder: 6,
    color: "#ef4444",
    isTerminal: true,
    isPositive: false,
  },
] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = postgres(databaseUrl, { prepare: false });
const db = drizzle({ client });

async function main() {
  const now = new Date().toISOString();

  let [pipeline] = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.slug, PIPELINE_SLUG))
    .limit(1);

  if (!pipeline) {
    const [created] = await db
      .insert(pipelines)
      .values({
        name: "Sales Pipeline",
        slug: PIPELINE_SLUG,
        description: "Default sales pipeline",
        color: "#6366f1",
        displayOrder: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: pipelines.id });

    if (!created) {
      console.error("Failed to create pipeline");
      process.exit(1);
    }

    pipeline = created;
    console.log(`Created pipeline: ${PIPELINE_SLUG}`);
  } else {
    console.log(`Pipeline already exists: ${PIPELINE_SLUG}`);
  }

  const existingStages = await db
    .select({ slug: stages.slug })
    .from(stages)
    .where(eq(stages.pipelineId, pipeline.id));

  const existingSlugs = new Set(existingStages.map((s) => s.slug));
  let createdCount = 0;

  for (const stage of STAGE_DEFINITIONS) {
    if (existingSlugs.has(stage.slug)) {
      continue;
    }

    await db.insert(stages).values({
      pipelineId: pipeline.id,
      name: stage.name,
      slug: stage.slug,
      displayOrder: stage.displayOrder,
      color: stage.color,
      isTerminal: stage.isTerminal,
      isPositive: stage.isPositive,
      createdAt: now,
    });
    createdCount++;
    console.log(`  + stage: ${stage.name} (${stage.slug})`);
  }

  if (createdCount === 0) {
    console.log("All stages already present.");
  } else {
    console.log(`Created ${createdCount} stage(s).`);
  }

  console.log("\nDone. CRM pipeline is ready.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
