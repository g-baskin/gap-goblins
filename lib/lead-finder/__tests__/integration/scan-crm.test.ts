// @vitest-environment node
import { and, count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  contacts,
  contactTimeline,
  deals,
  leadBusinesses,
  pipelines,
  stages,
} from "@/lib/db/schema";
import {
  advanceDealForward,
  ensureProspectPipeline,
  PROSPECT_PIPELINE_SLUG,
  upsertScannedBusiness,
} from "../../crm";
import type { LeadFinderDb } from "../../db";
import {
  createScan,
  getBranding,
  getBusinessDetail,
  getScan,
  listScanResults,
  listScans,
  upsertBranding,
} from "../../queries";
import { runLeadScan } from "../../scan-runner";
import type { NormalizedBusiness } from "../../types";
import { closeTestDb, createTenant, getTestDb } from "./harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const db = (await getTestDb()) as LeadFinderDb;
const suite = db ? describe : describe.skip;

const noFile = { loadSourceFile: async () => "" };

function business(overrides: Partial<NormalizedBusiness>): NormalizedBusiness {
  return {
    kgmid: null,
    placeId: null,
    cid: null,
    name: "Test Biz",
    mainCategory: "Plumber",
    address: "1 Main St",
    phoneRaw: null,
    phoneE164: null,
    website: "",
    gbpUrl: null,
    rating: 3.5,
    reviewCount: 4,
    imageCount: 2,
    canClaim: true,
    hasDescription: false,
    hasHours: false,
    ownerPostsCount: 0,
    isPermanentlyClosed: false,
    isTemporarilyClosed: false,
    email: null,
    rawPayload: null,
    ...overrides,
  };
}

async function countFor(table: typeof contacts | typeof deals, tenantId: string) {
  const [row] = await db.select({ n: count() }).from(table).where(eq(table.tenantId, tenantId));
  return row.n;
}

afterAll(async () => {
  if (db) await closeTestDb();
});

suite("prospects pipeline seed", () => {
  it("is idempotent, including concurrent calls", async () => {
    const tenantId = await createTenant(db, "seed");
    const results = await Promise.all([
      ensureProspectPipeline(db, tenantId),
      ensureProspectPipeline(db, tenantId),
      ensureProspectPipeline(db, tenantId),
    ]);
    await ensureProspectPipeline(db, tenantId);
    const rows = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, PROSPECT_PIPELINE_SLUG)));
    expect(rows).toHaveLength(1);
    expect(new Set(results.map((r) => r.pipelineId)).size).toBe(1);
    const stageRows = await db
      .select({ slug: stages.slug, order: stages.displayOrder })
      .from(stages)
      .where(eq(stages.pipelineId, rows[0].id))
      .orderBy(stages.displayOrder);
    expect(stageRows.map((s) => s.slug)).toEqual([
      "new-lead",
      "report-ready",
      "contacted",
      "replied",
      "meeting-booked",
      "won",
      "lost",
    ]);
  });

  it("gives each tenant its own pipeline", async () => {
    const a = await createTenant(db, "seed-a");
    const b = await createTenant(db, "seed-b");
    const pa = await ensureProspectPipeline(db, a);
    const pb = await ensureProspectPipeline(db, b);
    expect(pa.pipelineId).not.toBe(pb.pipelineId);
  });
});

suite("fixture scan end to end", () => {
  let tenantId: string;
  let firstScanId: string;

  beforeAll(async () => {
    tenantId = await createTenant(db, "scan");
  });

  it("plumbers in Fredericksburg VA → up to 50 scored prospects, weakest first", async () => {
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
    });
    firstScanId = scan.id;
    expect(scan.maxResults).toBe(50);
    await runLeadScan(db, { scanId: scan.id, tenantId }, noFile);

    const done = await getScan(db, tenantId, scan.id);
    expect(done).toMatchObject({
      status: "completed",
      foundCount: 60,
      skippedClosedCount: 3,
      processedCount: 50,
      createdCount: 50,
      updatedCount: 0,
      errorCount: 0,
    });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results).toHaveLength(50);
    const scores = results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    expect(scores[0]).toBeGreaterThan(scores[scores.length - 1]);
    expect(results.every((r) => r.contactId && r.dealId)).toBe(true);
    expect(await countFor(contacts, tenantId)).toBe(50);
    expect(await countFor(deals, tenantId)).toBe(50);
  });

  it("re-running the same scan creates zero new contacts or deals", async () => {
    const pipeline = await ensureProspectPipeline(db, tenantId);
    const [first] = await listScanResults(db, tenantId, firstScanId);
    // Move one deal forward; the re-scan must not move it back.
    expect(
      await advanceDealForward(db, {
        tenantId,
        dealId: first.dealId as string,
        target: "contacted",
        pipeline,
      }),
    ).toBe(true);

    const rescan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
    });
    await runLeadScan(db, { scanId: rescan.id, tenantId }, noFile);
    const done = await getScan(db, tenantId, rescan.id);
    expect(done).toMatchObject({ status: "completed", createdCount: 0, updatedCount: 50 });
    expect(await countFor(contacts, tenantId)).toBe(50);
    expect(await countFor(deals, tenantId)).toBe(50);
    expect(await listScanResults(db, tenantId, rescan.id)).toHaveLength(50);

    const [deal] = await db
      .select({ stageId: deals.stageId })
      .from(deals)
      .where(eq(deals.id, first.dealId as string));
    expect(deal.stageId).toBe(pipeline.stages.contacted.id);
    // A backward move is refused.
    expect(
      await advanceDealForward(db, {
        tenantId,
        dealId: first.dealId as string,
        target: "report-ready",
        pipeline,
      }),
    ).toBe(false);

    const timeline = await db
      .select({ title: contactTimeline.title })
      .from(contactTimeline)
      .where(
        and(
          eq(contactTimeline.tenantId, tenantId),
          eq(contactTimeline.contactId, first.contactId as string),
        ),
      );
    expect(timeline.some((t) => /^Rescanned: score \d+ → \d+$/.test(t.title))).toBe(true);

    const detail = await getBusinessDetail(db, tenantId, first.businessId);
    expect(detail?.history).toHaveLength(2);
    expect(detail?.deal?.stageName).toBe("Contacted");
  });

  it("a scan that is already finished is not re-run", async () => {
    const before = await countFor(contacts, tenantId);
    await runLeadScan(db, { scanId: firstScanId, tenantId }, noFile);
    expect(await countFor(contacts, tenantId)).toBe(before);
  });
});

suite("dedupe order kgmid → place_id → cid → phone_e164 → gbp_url", () => {
  it("matches on each key in turn and prefers the earliest key", async () => {
    const tenantId = await createTenant(db, "dedupe");
    const pipeline = await ensureProspectPipeline(db, tenantId);
    const scan = await createScan(db, tenantId, { niche: "n", location: "l", source: "fixture" });
    const up = (b: Partial<NormalizedBusiness>) =>
      upsertScannedBusiness(db, { tenantId, scanId: scan.id, business: business(b), pipeline });

    const byKgmid = await up({ name: "K", kgmid: "/g/k1", placeId: "PA" });
    const byPlace = await up({ name: "P", placeId: "PB" });
    const byCid = await up({ name: "C", cid: "111" });
    const byPhone = await up({ name: "T", phoneE164: "+15405550111" });
    const byGbp = await up({ name: "G", gbpUrl: "https://maps.example/g" });

    // Each key alone finds its business.
    expect((await up({ name: "K2", kgmid: "/g/k1" })).businessId).toBe(byKgmid.businessId);
    expect((await up({ name: "P2", placeId: "PB" })).businessId).toBe(byPlace.businessId);
    expect((await up({ name: "C2", cid: "111" })).businessId).toBe(byCid.businessId);
    expect((await up({ name: "T2", phoneE164: "+15405550111" })).businessId).toBe(
      byPhone.businessId,
    );
    expect((await up({ name: "G2", gbpUrl: "https://maps.example/g" })).businessId).toBe(
      byGbp.businessId,
    );

    // kgmid wins over a place_id that points at a different business.
    expect((await up({ name: "mix", kgmid: "/g/k1", placeId: "PB" })).businessId).toBe(
      byKgmid.businessId,
    );
    // An unknown kgmid falls through to place_id; the stored kgmid is kept.
    const fallthrough = await up({ name: "fall", kgmid: "/g/new", placeId: "PA" });
    expect(fallthrough.businessId).toBe(byKgmid.businessId);
    const [row] = await db
      .select({ kgmid: leadBusinesses.kgmid })
      .from(leadBusinesses)
      .where(eq(leadBusinesses.id, byKgmid.businessId));
    expect(row.kgmid).toBe("/g/k1");
    // A shared phone does not merge two businesses whose KGMIDs differ…
    const phoneOwner = await up({ name: "Phone A", kgmid: "/g/pa", phoneE164: "+15405550177" });
    const otherBiz = await up({ name: "Phone B", kgmid: "/g/pb", phoneE164: "+15405550177" });
    expect(otherBiz.businessId).not.toBe(phoneOwner.businessId);
    expect(otherBiz.created).toBe(true);
    // …but still matches when the stored record has no KGMID (the phone row above).
    expect((await up({ name: "T3", kgmid: "/g/t3", phoneE164: "+15405550111" })).businessId).toBe(
      byPhone.businessId,
    );
    // place_id beats cid.
    const placeVsCid = await up({ name: "pc", placeId: "PB", cid: "111" });
    expect(placeVsCid.businessId).toBe(byPlace.businessId);

    expect(await countFor(contacts, tenantId)).toBe(7);
    expect(await countFor(deals, tenantId)).toBe(7);
  });
});

suite("csv-import scan", () => {
  it("uses the uploaded file; niche and location are labels", async () => {
    const tenantId = await createTenant(db, "csv");
    const csv = [
      "KGMID,NAME,PHONE,WEBSITE,REVIEWS,RATING,CAN_CLAIM,IMAGE_COUNT,IS_PERMANENTLY_CLOSED",
      "/g/c1,Alpha Plumbing,(540) 555-0101,,3,3.1,TRUE,1,FALSE",
      "/g/c2,Beta Plumbing,(540) 555-0102,https://beta.example,90,4.9,FALSE,50,FALSE",
      "/g/c3,Closed Plumbing,(540) 555-0103,,0,,TRUE,0,TRUE",
      ",,,,,,,,",
    ].join("\n");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "csv-import",
      sourceFileKey: `tenants/${tenantId}/lead-imports/x.csv`,
      sourceFileName: "x.csv",
    });
    await runLeadScan(db, { scanId: scan.id, tenantId }, { loadSourceFile: async () => csv });
    expect(await getScan(db, tenantId, scan.id)).toMatchObject({
      status: "completed",
      foundCount: 3,
      skippedClosedCount: 1,
      createdCount: 2,
      errorCount: 1,
    });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results.map((r) => r.name)).toEqual(["Alpha Plumbing", "Beta Plumbing"]);
    expect(results[0].score).toBe(100);
    expect(results[0].flags).toMatchObject({
      gbp_unclaimed: true,
      no_website: true,
      gbp_thin: false,
    });
    // The columns this CSV lacks stay "Not checked".
    expect(results[1].flags.gbp_thin).toBe("unknown");
  });

  it("fails cleanly with an explicit message for an unusable source", async () => {
    const tenantId = await createTenant(db, "omkar");
    const scan = await createScan(db, tenantId, {
      niche: "n",
      location: "l",
      source: "omkar-desktop",
    });
    await runLeadScan(db, { scanId: scan.id, tenantId }, noFile);
    const done = await getScan(db, tenantId, scan.id);
    expect(done?.status).toBe("failed");
    expect(done?.errorMessage).toMatch(/UNVERIFIED/);
    expect(await countFor(contacts, tenantId)).toBe(0);
  });
});

suite("cross-tenant isolation (queries)", () => {
  it("tenant B cannot read or run tenant A's scans, businesses or branding", async () => {
    const a = await createTenant(db, "iso-a");
    const b = await createTenant(db, "iso-b");
    const scan = await createScan(db, a, {
      niche: "plumbers",
      location: "Richmond VA",
      source: "fixture",
    });
    await runLeadScan(db, { scanId: scan.id, tenantId: a }, noFile);
    const [first] = await listScanResults(db, a, scan.id);
    await upsertBranding(db, a, { companyName: "Tenant A Agency" });

    expect(await getScan(db, b, scan.id)).toBeNull();
    expect(await listScans(db, b)).toHaveLength(0);
    expect(await listScanResults(db, b, scan.id)).toEqual([]);
    expect(await getBusinessDetail(db, b, first.businessId)).toBeNull();
    expect(await getBranding(db, b)).toBeNull();
    expect((await getBranding(db, a))?.companyName).toBe("Tenant A Agency");
    await expect(runLeadScan(db, { scanId: scan.id, tenantId: b }, noFile)).rejects.toThrow(
      /not found/,
    );

    // Same fixture data in tenant B creates B's own records, never touching A's.
    const scanB = await createScan(db, b, {
      niche: "plumbers",
      location: "Richmond VA",
      source: "fixture",
    });
    await runLeadScan(db, { scanId: scanB.id, tenantId: b }, noFile);
    expect(await getScan(db, b, scanB.id)).toMatchObject({ createdCount: 50 });
    expect(await countFor(contacts, a)).toBe(50);
    expect(await countFor(contacts, b)).toBe(50);
  });
});
