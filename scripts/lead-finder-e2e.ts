/**
 * Local end-to-end check for Lead Finder through the REAL worker and queue.
 *
 *   bun --env-file=.env.local run worker          # terminal 1
 *   bun --env-file=.env.local scripts/lead-finder-e2e.ts [--out _planning/samples]
 *
 * Creates (or reuses) a demo tenant "gap-goblins-demo" with report branding,
 * queues a fixture scan "plumbers in Fredericksburg VA" on `lead-scan.run`,
 * waits for the worker, re-runs it to prove idempotency, then queues a PDF on
 * `lead-report.generate` for the weakest prospect, downloads it from storage
 * and writes it to the output folder. Local dev only: refuses non-local DBs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, count, eq } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import { contacts, deals, leadReports, tenants } from "../lib/db/schema";
import { closeWorkerDb, db } from "../lib/db/worker";
import { createScan, getScan, listScanResults, upsertBranding } from "../lib/lead-finder/queries";
import { LEAD_REPORT_QUEUE } from "../lib/lead-finder/report-service";
import { LEAD_SCAN_QUEUE } from "../lib/lead-finder/scan-runner";
import { workerDownloadFile } from "../lib/storage/worker";

const outArg = process.argv.indexOf("--out");
const outDir = path.resolve(outArg > 0 ? process.argv[outArg + 1] : "_planning/samples");

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1):5442\//.test(databaseUrl)) {
  console.error(
    "Refusing to run: DATABASE_URL must be the local Gap Goblins database (port 5442).",
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForScan(tenantId: string, scanId: string) {
  for (let i = 0; i < 120; i++) {
    const scan = await getScan(db, tenantId, scanId);
    if (scan && !["queued", "running"].includes(scan.status)) return scan;
    await sleep(1000);
  }
  throw new Error("Timed out waiting for the worker. Is `bun run worker` running?");
}

async function counts(tenantId: string) {
  const [c] = await db.select({ n: count() }).from(contacts).where(eq(contacts.tenantId, tenantId));
  const [d] = await db.select({ n: count() }).from(deals).where(eq(deals.tenantId, tenantId));
  return { contacts: c.n, deals: d.n };
}

async function main() {
  const boss = new PgBoss(databaseUrl);
  await boss.start();
  await boss.createQueue(LEAD_SCAN_QUEUE);
  await boss.createQueue(LEAD_REPORT_QUEUE);

  let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "gap-goblins-demo"));
  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({ slug: "gap-goblins-demo", name: "Gap Goblins Demo" })
      .returning();
  }
  const tenantId = tenant.id;
  await upsertBranding(db, tenantId, {
    companyName: "Rappahannock Local Growth",
    primaryColor: "#14532d",
    accentColor: "#f59e0b",
    ctaHeadline: "Want help closing these gaps?",
    ctaBody:
      "We help Fredericksburg-area trades fix exactly these issues. Book a free 15-minute walkthrough of this report.",
    ctaUrl: "https://example.com/book",
    contactEmail: "hello@example.com",
    contactPhone: "(540) 555-0199",
    website: "https://example.com",
    physicalAddress: "100 Example St, Fredericksburg, VA 22401",
  });

  const before = await counts(tenantId);
  const runs = [];
  for (const label of ["first run", "re-run"]) {
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
    });
    await boss.send(LEAD_SCAN_QUEUE, { scanId: scan.id, tenantId });
    const done = await waitForScan(tenantId, scan.id);
    const after = await counts(tenantId);
    runs.push({ label, scan: done, after });
    console.log(
      `[e2e] ${label}: status=${done.status} found=${done.foundCount} scored=${done.processedCount} ` +
        `created=${done.createdCount} updated=${done.updatedCount} skippedClosed=${done.skippedClosedCount} ` +
        `contacts=${after.contacts} deals=${after.deals}`,
    );
  }
  const lastScan = runs[runs.length - 1].scan;
  const results = await listScanResults(db, tenantId, lastScan.id);
  const weakest = results[0];
  console.log(
    `[e2e] weakest first: ${results
      .slice(0, 5)
      .map((r) => `${r.score} ${r.name}`)
      .join(" | ")}`,
  );

  const reportsBefore = await db
    .select({ id: leadReports.id })
    .from(leadReports)
    .where(and(eq(leadReports.tenantId, tenantId), eq(leadReports.businessId, weakest.businessId)));
  await boss.send(LEAD_REPORT_QUEUE, {
    tenantId,
    businessId: weakest.businessId,
    scanResultId: weakest.scanResultId,
  });
  let report: typeof leadReports.$inferSelect | undefined;
  for (let i = 0; i < 120 && !report; i++) {
    const rows = await db
      .select()
      .from(leadReports)
      .where(
        and(eq(leadReports.tenantId, tenantId), eq(leadReports.businessId, weakest.businessId)),
      );
    report = rows.find((r) => !reportsBefore.some((b) => b.id === r.id));
    if (!report) await sleep(1000);
  }
  if (!report) throw new Error("Timed out waiting for the PDF job");
  const pdf = await workerDownloadFile(report.storageKey);
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "sample-gap-report.pdf");
  writeFileSync(file, pdf);
  console.log(`[e2e] PDF: ${report.storageKey} (${pdf.length} bytes) → ${file}`);
  console.log(
    JSON.stringify({
      tenantId,
      before,
      runs: runs.map((r) => ({ label: r.label, after: r.after })),
    }),
  );

  await boss.stop();
  await closeWorkerDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeWorkerDb();
  process.exit(1);
});
