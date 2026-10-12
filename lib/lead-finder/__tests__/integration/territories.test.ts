// @vitest-environment node
import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { leadBusinesses, leadScans } from "@/lib/db/schema";
import type { LeadFinderDb } from "../../db";
import { createScan, getScan, listScanResults } from "../../queries";
import { runLeadScan } from "../../scan-runner";
import {
  deleteTerritory,
  getTerritory,
  listTerritories,
  saveTerritory,
} from "../../territories/store";
import type { GeoPoint, TerritoryZip } from "../../territories/types";
import { closeTestDb, createTenant, getTestDb } from "./harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const db = (await getTestDb()) as LeadFinderDb;
const suite = db ? describe : describe.skip;

afterAll(async () => {
  await closeTestDb();
});

const square = (south: number, west: number, size: number): GeoPoint[] => [
  { lat: south, lng: west },
  { lat: south, lng: west + size },
  { lat: south + size, lng: west + size },
  { lat: south + size, lng: west },
];
/** Downtown Fredericksburg, roughly. */
const DOWNTOWN = { outer: square(38.28, -77.49, 0.05), holes: [] };
const zip22401: TerritoryZip = {
  zip: "22401",
  source: "test",
  polygons: [{ outer: square(38.28, -77.5, 0.06), holes: [] }],
};

async function territory(tenantId: string, name: string) {
  const saved = await saveTerritory(db, tenantId, { name, polygons: [DOWNTOWN], zips: [] });
  if (!saved.ok) throw new Error(saved.error);
  return saved.territory;
}

suite("territory store", () => {
  it("saves, lists, updates and deletes a tenant's territories", async () => {
    const tenantId = await createTenant(db, "terr-store");
    const created = await saveTerritory(db, tenantId, {
      name: "  Downtown  ",
      polygons: [DOWNTOWN],
      zips: [zip22401],
    });
    expect(created).toMatchObject({ ok: true, territory: { name: "Downtown" } });
    if (!created.ok) return;

    const listed = await listTerritories(db, tenantId);
    expect(listed.map((t) => t.name)).toEqual(["Downtown"]);
    expect(listed[0]?.zips.map((z) => z.zip)).toEqual(["22401"]);
    expect(listed[0]?.polygons).toEqual([DOWNTOWN]);

    const updated = await saveTerritory(
      db,
      tenantId,
      { name: "Downtown core", polygons: [DOWNTOWN], zips: [] },
      { territoryId: created.territory.id },
    );
    expect(updated).toMatchObject({ ok: true, territory: { name: "Downtown core", zips: [] } });

    expect(await deleteTerritory(db, tenantId, created.territory.id)).toBe(true);
    expect(await getTerritory(db, tenantId, created.territory.id)).toBeNull();
  });

  it("rejects duplicate names per tenant, but allows the same name in another tenant", async () => {
    const a = await createTenant(db, "terr-dup-a");
    const b = await createTenant(db, "terr-dup-b");
    await territory(a, "North");
    expect(
      await saveTerritory(db, a, { name: "North", polygons: [DOWNTOWN], zips: [] }),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      await saveTerritory(db, b, { name: "North", polygons: [DOWNTOWN], zips: [] }),
    ).toMatchObject({ ok: true });
  });

  it("refuses invalid shapes before they reach the database", async () => {
    const tenantId = await createTenant(db, "terr-invalid");
    expect(
      await saveTerritory(db, tenantId, { name: "Empty", polygons: [], zips: [] }),
    ).toMatchObject({ ok: false, status: 400 });
    const bowTie = [
      { lat: 38, lng: -77 },
      { lat: 38.1, lng: -76.9 },
      { lat: 38, lng: -76.9 },
      { lat: 38.1, lng: -77 },
    ];
    expect(
      await saveTerritory(db, tenantId, {
        name: "Bow tie",
        polygons: [{ outer: bowTie, holes: [] }],
        zips: [],
      }),
    ).toMatchObject({ ok: false, status: 400, error: expect.stringContaining("cross") });
    expect(await listTerritories(db, tenantId)).toEqual([]);
  });

  it("tenant B cannot read, update or delete tenant A's territory", async () => {
    const a = await createTenant(db, "terr-iso-a");
    const b = await createTenant(db, "terr-iso-b");
    const owned = await territory(a, "A only");

    expect(await getTerritory(db, b, owned.id)).toBeNull();
    expect(await listTerritories(db, b)).toEqual([]);
    expect(
      await saveTerritory(
        db,
        b,
        { name: "Hijacked", polygons: [DOWNTOWN], zips: [] },
        { territoryId: owned.id },
      ),
    ).toMatchObject({ ok: false, status: 404 });
    expect(await deleteTerritory(db, b, owned.id)).toBe(false);
    expect((await getTerritory(db, a, owned.id))?.name).toBe("A only");
  });

  it("the database refuses a scan pointing at another tenant's territory", async () => {
    const a = await createTenant(db, "terr-fk-a");
    const b = await createTenant(db, "terr-fk-b");
    const owned = await territory(a, "A area");
    await expect(
      createScan(db, b, {
        niche: "plumbers",
        location: "Fredericksburg VA",
        source: "fixture",
        territory: { id: owned.id, name: owned.name },
      }),
    ).rejects.toThrow();
  });
});

suite("territory scans", () => {
  const csv = [
    "KGMID,NAME,ADDRESS,COORDINATES,DETAILED_ADDRESS,PHONE,REVIEWS",
    // Inside the drawn downtown area.
    '/g/t1,Inside Plumbing,"1 Caroline St, Fredericksburg, VA 22401","{""latitude"": 38.30, ""longitude"": -77.46}",,(540) 555-0201,3',
    // Outside: Richmond.
    '/g/t2,Richmond Plumbing,"1 Broad St, Richmond, VA 23219","{""latitude"": 37.54, ""longitude"": -77.44}",,(804) 555-0202,4',
    // No coordinates; address lookup puts it inside.
    '/g/t3,Lookup Plumbing,"900 Princess Anne St, Fredericksburg, VA 22401",,,(540) 555-0203,5',
    // No location at all: kept as Not checked.
    "/g/t4,Mystery Plumbing,,,,(540) 555-0204,6",
  ].join("\n");

  it("skips businesses outside the territory and labels the rest", async () => {
    const tenantId = await createTenant(db, "terr-scan");
    const owned = await territory(tenantId, "Downtown");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "csv-import",
      sourceFileKey: `tenants/${tenantId}/lead-imports/t.csv`,
      sourceFileName: "t.csv",
      territory: { id: owned.id, name: owned.name },
    });
    const looked: string[] = [];
    await runLeadScan(
      db,
      { scanId: scan.id, tenantId },
      {
        loadSourceFile: async () => csv,
        geocode: async (address) => {
          looked.push(address);
          return {
            ok: true,
            value: { point: { lat: 38.3, lng: -77.47 }, postalCode: "22401" },
          };
        },
      },
    );

    expect(await getScan(db, tenantId, scan.id)).toMatchObject({
      status: "completed",
      foundCount: 4,
      createdCount: 3,
      skippedOutsideTerritoryCount: 1,
      territoryName: "Downtown",
    });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(Object.fromEntries(results.map((r) => [r.name, r.territoryStatus]))).toEqual({
      "Inside Plumbing": "inside",
      "Lookup Plumbing": "inside",
      "Mystery Plumbing": "unknown",
    });
    // Only the business with an address and no coordinates was looked up.
    expect(looked).toEqual(["900 Princess Anne St, Fredericksburg, VA 22401"]);

    const [lookedUp] = await db
      .select({
        latitude: leadBusinesses.latitude,
        source: leadBusinesses.locationSource,
        attempted: leadBusinesses.geocodeAttemptedAt,
        zip: leadBusinesses.postalCode,
      })
      .from(leadBusinesses)
      .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.kgmid, "/g/t3")));
    expect(lookedUp).toMatchObject({ latitude: 38.3, source: "census-geocoder", zip: "22401" });
    expect(lookedUp?.attempted).not.toBeNull();
  });

  it("re-scanning reuses stored locations instead of looking them up again", async () => {
    const tenantId = await createTenant(db, "terr-rescan");
    const owned = await territory(tenantId, "Downtown");
    const run = async (geocode: (address: string) => Promise<never>) => {
      const scan = await createScan(db, tenantId, {
        niche: "plumbers",
        location: "Fredericksburg VA",
        source: "csv-import",
        sourceFileKey: `tenants/${tenantId}/lead-imports/t.csv`,
        sourceFileName: "t.csv",
        territory: { id: owned.id, name: owned.name },
      });
      await runLeadScan(
        db,
        { scanId: scan.id, tenantId },
        { loadSourceFile: async () => csv, geocode },
      );
      return scan.id;
    };
    let calls = 0;
    await run(async () => {
      calls += 1;
      return { ok: true, value: { point: { lat: 38.3, lng: -77.47 }, postalCode: null } } as never;
    });
    expect(calls).toBe(1);
    const second = await run(async () => {
      throw new Error("must not be called on a re-scan");
    });
    const results = await listScanResults(db, tenantId, second);
    expect(results.find((r) => r.name === "Lookup Plumbing")?.territoryStatus).toBe("inside");
    expect(await getScan(db, tenantId, second)).toMatchObject({ createdCount: 0, updatedCount: 3 });
  });

  it("applies max results after skipping outside businesses", async () => {
    const tenantId = await createTenant(db, "terr-cap");
    const owned = await territory(tenantId, "Downtown");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "csv-import",
      maxResults: 1,
      sourceFileKey: `tenants/${tenantId}/lead-imports/t.csv`,
      sourceFileName: "t.csv",
      territory: { id: owned.id, name: owned.name },
    });
    const cappedCsv = [
      "KGMID,NAME,COORDINATES",
      '/g/c1,Far Away,"{""latitude"": 37.54, ""longitude"": -77.44}"',
      '/g/c2,Close By,"{""latitude"": 38.30, ""longitude"": -77.46}"',
    ].join("\n");
    await runLeadScan(db, { scanId: scan.id, tenantId }, { loadSourceFile: async () => cappedCsv });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results.map((r) => r.name)).toEqual(["Close By"]);
  });

  it("never looks up sample data addresses: sample businesses stay Not checked", async () => {
    const tenantId = await createTenant(db, "terr-sample");
    const owned = await territory(tenantId, "Downtown");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
      maxResults: 10,
      territory: { id: owned.id, name: owned.name },
    });
    let lookups = 0;
    await runLeadScan(
      db,
      { scanId: scan.id, tenantId },
      {
        loadSourceFile: async () => "",
        geocode: async () => {
          lookups += 1;
          return { ok: true, value: { point: { lat: 38.3, lng: -77.47 }, postalCode: "22401" } };
        },
      },
    );
    expect(lookups).toBe(0);
    expect(await getScan(db, tenantId, scan.id)).toMatchObject({
      status: "completed",
      createdCount: 10,
      skippedOutsideTerritoryCount: 0,
    });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(new Set(results.map((r) => r.territoryStatus))).toEqual(new Set(["unknown"]));
    const located = await db
      .select({ id: leadBusinesses.id })
      .from(leadBusinesses)
      .where(and(eq(leadBusinesses.tenantId, tenantId), isNotNull(leadBusinesses.latitude)));
    expect(located).toEqual([]);
  });

  it("a scan without a territory is unchanged: no filtering, no territory status", async () => {
    const tenantId = await createTenant(db, "terr-none");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "csv-import",
      sourceFileKey: `tenants/${tenantId}/lead-imports/t.csv`,
      sourceFileName: "t.csv",
    });
    await runLeadScan(
      db,
      { scanId: scan.id, tenantId },
      {
        loadSourceFile: async () => csv,
        geocode: async () => {
          throw new Error("no lookups without a territory");
        },
      },
    );
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.territoryStatus === null)).toBe(true);
  });

  it("deleting a territory keeps its past scans and their label", async () => {
    const tenantId = await createTenant(db, "terr-delete");
    const owned = await territory(tenantId, "Temporary");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
      territory: { id: owned.id, name: owned.name },
    });
    await runLeadScan(db, { scanId: scan.id, tenantId }, { loadSourceFile: async () => "" });
    expect(await deleteTerritory(db, tenantId, owned.id)).toBe(true);
    const [row] = await db
      .select({
        tenantId: leadScans.tenantId,
        territoryId: leadScans.territoryId,
        territoryName: leadScans.territoryName,
      })
      .from(leadScans)
      .where(eq(leadScans.id, scan.id));
    expect(row).toEqual({ tenantId, territoryId: null, territoryName: "Temporary" });
    // Sample businesses have no location, so every result is "Not checked".
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.territoryStatus === "unknown")).toBe(true);
  });

  it("a queued scan whose territory is deleted still runs, without the filter", async () => {
    const tenantId = await createTenant(db, "terr-gone");
    const owned = await territory(tenantId, "Gone");
    const scan = await createScan(db, tenantId, {
      niche: "plumbers",
      location: "Fredericksburg VA",
      source: "fixture",
      territory: { id: owned.id, name: owned.name },
    });
    await deleteTerritory(db, tenantId, owned.id);
    // territory_id was cleared by the delete, so the scan runs without a filter.
    await runLeadScan(db, { scanId: scan.id, tenantId }, { loadSourceFile: async () => "" });
    expect(await getScan(db, tenantId, scan.id)).toMatchObject({
      status: "completed",
      territoryId: null,
      territoryName: "Gone",
      skippedOutsideTerritoryCount: 0,
    });
    const results = await listScanResults(db, tenantId, scan.id);
    expect(results.every((r) => r.territoryStatus === null)).toBe(true);
  });

  it("a location found earlier is not erased by a re-scan without one", async () => {
    const tenantId = await createTenant(db, "terr-keep");
    const scan = async (file: string) => {
      const created = await createScan(db, tenantId, {
        niche: "plumbers",
        location: "Fredericksburg VA",
        source: "csv-import",
        sourceFileKey: `tenants/${tenantId}/lead-imports/k.csv`,
        sourceFileName: "k.csv",
      });
      await runLeadScan(db, { scanId: created.id, tenantId }, { loadSourceFile: async () => file });
    };
    await scan(["KGMID,NAME,COORDINATES,ZIP", '/g/k1,Keeper,"38.3, -77.46",22401'].join("\n"));
    await scan(["KGMID,NAME", "/g/k1,Keeper"].join("\n"));
    const [row] = await db
      .select({
        lat: leadBusinesses.latitude,
        lng: leadBusinesses.longitude,
        zip: leadBusinesses.postalCode,
        source: leadBusinesses.locationSource,
      })
      .from(leadBusinesses)
      .where(and(eq(leadBusinesses.tenantId, tenantId), eq(leadBusinesses.kgmid, "/g/k1")));
    expect(row).toEqual({ lat: 38.3, lng: -77.46, zip: "22401", source: "source" });
  });
});
