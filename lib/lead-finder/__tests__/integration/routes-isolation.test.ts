// @vitest-environment node
/**
 * Cross-tenant isolation for every Lead Finder route, against real Postgres.
 * Real tenant resolution (memberships in the DB); only the session, storage
 * and queue are stubbed. Tenant B's admin must not read, run or generate
 * anything belonging to tenant A, whether by guessing ids or by asking for
 * tenant A in the x-tenant-id header.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { LeadFinderDb } from "../../db";
import { closeTestDb, createTenant, getTestDb } from "./harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const state = vi.hoisted(() => ({
  userId: "",
  storage: new Map<string, Buffer>(),
  enqueued: [] as { queue: string; payload: unknown }[],
}));

vi.mock("@/lib/db", async () => {
  const { getTestDb: get } = await import("./harness");
  return { db: await get() };
});
vi.mock("@/lib/auth", () => ({
  auth: async () => (state.userId ? { user: { id: state.userId, role: "admin" } } : null),
}));
vi.mock("@/lib/storage", () => ({
  uploadFile: async (key: string, body: Buffer) => {
    state.storage.set(key, Buffer.from(body));
  },
  downloadFile: async (key: string) => {
    const value = state.storage.get(key);
    return value ? new Uint8Array(value) : null;
  },
  deleteFile: async (key: string) => {
    state.storage.delete(key);
  },
}));
vi.mock("@/lib/queue", () => ({
  enqueueLeadScan: async (payload: unknown) => {
    state.enqueued.push({ queue: "lead-scan.run", payload });
    return "job-scan";
  },
  enqueueLeadReport: async (payload: unknown) => {
    state.enqueued.push({ queue: "lead-report.generate", payload });
    return "job-report";
  },
}));

const db = (await getTestDb()) as LeadFinderDb;
const suite = db ? describe : describe.skip;

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function createAdmin(tenantId: string, role = "owner") {
  const [user] = await db
    .insert(schema.adminUsers)
    .values({ email: `${randomUUID()}@test.local`, passwordHash: "x", role: "admin" })
    .returning({ id: schema.adminUsers.id });
  await db.insert(schema.tenantMemberships).values({ tenantId, userId: user.id, role });
  return user.id;
}

function req(url: string, init: RequestInit & { tenant?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.tenant) headers.set("x-tenant-id", init.tenant);
  return new Request(`http://localhost${url}`, { ...init, headers });
}

const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

afterAll(async () => {
  if (db) await closeTestDb();
});

suite("Lead Finder route isolation", () => {
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let scanA: string;
  let businessA: string;
  let reportA: string;

  const scans = () => import("@/app/api/lead-finder/scans/route");
  const scanById = () => import("@/app/api/lead-finder/scans/[scanId]/route");
  const business = () => import("@/app/api/lead-finder/businesses/[businessId]/route");
  const preview = () => import("@/app/api/lead-finder/businesses/[businessId]/report/route");
  const reports = () => import("@/app/api/lead-finder/businesses/[businessId]/reports/route");
  const download = () => import("@/app/api/lead-finder/reports/[reportId]/download/route");
  const branding = () => import("@/app/api/lead-finder/branding/route");
  const logo = () => import("@/app/api/lead-finder/branding/logo/route");

  beforeAll(async () => {
    tenantA = await createTenant(db, "iso-a");
    tenantB = await createTenant(db, "iso-b");
    userA = await createAdmin(tenantA);
    userB = await createAdmin(tenantB);

    // Tenant A: a completed fixture scan, branding with a logo, and a stored report.
    state.userId = userA;
    const created = await (await scans()).POST(
      req("/api/lead-finder/scans", {
        method: "POST",
        tenant: tenantA,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          niche: "plumbers",
          location: "Fredericksburg VA",
          source: "fixture",
          maxResults: 5,
        }),
      }),
    );
    expect(created.status).toBe(201);
    scanA = (await created.json()).scan.id;
    const { runLeadScan } = await import("../../scan-runner");
    await runLeadScan(db, { scanId: scanA, tenantId: tenantA }, { loadSourceFile: async () => "" });

    const listed = await (await scanById()).GET(
      req(`/api/lead-finder/scans/${scanA}`, { tenant: tenantA }),
      p({ scanId: scanA }),
    );
    const body = await listed.json();
    expect(body.results).toHaveLength(5);
    businessA = body.results[0].businessId;

    const put = await (await branding()).PUT(
      req("/api/lead-finder/branding", {
        method: "PUT",
        tenant: tenantA,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: "Tenant A Agency", primaryColor: "#112233" }),
      }),
    );
    expect(put.status).toBe(200);
    const form = new FormData();
    form.set("file", new File([PNG_1PX], "logo.png", { type: "image/png" }));
    const up = await (await logo()).POST(
      req("/api/lead-finder/branding/logo", { method: "POST", tenant: tenantA, body: form }),
    );
    expect(up.status).toBe(201);

    const { generateReport } = await import("../../report-service");
    const report = await generateReport(
      db,
      { tenantId: tenantA, businessId: businessA },
      {
        storage: {
          download: async (key) => state.storage.get(key) ?? Promise.reject(new Error("missing")),
          upload: async (key, bodyBytes) => {
            state.storage.set(key, bodyBytes);
          },
        },
        renderPdf: async () => ({ pdf: Buffer.from("%PDF-1.7 test") }),
      },
    );
    reportA = report.id;
    expect(report.storageKey.startsWith(`tenants/${tenantA}/`)).toBe(true);
  });

  it("tenant A can use its own surfaces", async () => {
    state.userId = userA;
    expect(
      (await (await business()).GET(req(`/x`, { tenant: tenantA }), p({ businessId: businessA })))
        .status,
    ).toBe(200);
    const html = await (await preview()).GET(
      req(`/x`, { tenant: tenantA }),
      p({ businessId: businessA }),
    );
    expect(html.status).toBe(200);
    expect(html.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await html.text()).toContain("Tenant A Agency");
    const dl = await (await download()).GET(
      req(`/x?tenantId=${tenantA}`),
      p({ reportId: reportA }),
    );
    expect(dl.status).toBe(200);
    expect(dl.headers.get("content-type")).toBe("application/pdf");
  });

  it("tenant B's admin cannot ask for tenant A in the header", async () => {
    state.userId = userB;
    const responses = await Promise.all([
      (await scans()).GET(req("/x", { tenant: tenantA })),
      (await scanById()).GET(req("/x", { tenant: tenantA }), p({ scanId: scanA })),
      (await business()).GET(req("/x", { tenant: tenantA }), p({ businessId: businessA })),
      (await preview()).GET(req("/x", { tenant: tenantA }), p({ businessId: businessA })),
      (await reports()).POST(
        req("/x", { method: "POST", tenant: tenantA }),
        p({ businessId: businessA }),
      ),
      (await download()).GET(req(`/x?tenantId=${tenantA}`), p({ reportId: reportA })),
      (await branding()).GET(req("/x", { tenant: tenantA })),
      (await logo()).GET(req("/x", { tenant: tenantA })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403, 403, 403]);
  });

  it("tenant B's admin cannot reach tenant A's rows by id from its own tenant", async () => {
    state.userId = userB;
    const enqueuedBefore = state.enqueued.length;
    const responses = await Promise.all([
      (await scanById()).GET(req("/x", { tenant: tenantB }), p({ scanId: scanA })),
      (await scanById()).DELETE(
        req("/x", { method: "DELETE", tenant: tenantB }),
        p({ scanId: scanA }),
      ),
      (await business()).GET(req("/x", { tenant: tenantB }), p({ businessId: businessA })),
      (await preview()).GET(req("/x", { tenant: tenantB }), p({ businessId: businessA })),
      (await reports()).GET(req("/x", { tenant: tenantB }), p({ businessId: businessA })),
      (await reports()).POST(
        req("/x", { method: "POST", tenant: tenantB }),
        p({ businessId: businessA }),
      ),
      (await download()).GET(req(`/x?tenantId=${tenantB}`), p({ reportId: reportA })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([404, 404, 404, 404, 404, 404, 404]);
    expect(state.enqueued.length).toBe(enqueuedBefore); // nothing was generated for B

    const list = await (await scans()).GET(req("/x", { tenant: tenantB }));
    expect((await list.json()).scans).toEqual([]);
    const brand = await (await branding()).GET(req("/x", { tenant: tenantB }));
    expect((await brand.json()).branding).toBeNull();
    expect((await (await logo()).GET(req("/x", { tenant: tenantB }))).status).toBe(404);
  });

  it("tenant B's branding writes never touch tenant A", async () => {
    state.userId = userB;
    await (await branding()).PUT(
      req("/x", {
        method: "PUT",
        tenant: tenantB,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: "B Co",
          logoStorageKey: `tenants/${tenantA}/branding/x.png`,
        }),
      }),
    );
    state.userId = userA;
    const a = await (await branding()).GET(req("/x", { tenant: tenantA }));
    expect((await a.json()).branding.companyName).toBe("Tenant A Agency");
    state.userId = userB;
    const b = await (await branding()).GET(req("/x", { tenant: tenantB }));
    // logoStorageKey is not accepted from the JSON body.
    expect((await b.json()).branding).toMatchObject({ companyName: "B Co", logoStorageKey: null });
  });

  it("rejects unauthenticated requests and bad uploads", async () => {
    state.userId = "";
    expect((await (await scans()).GET(req("/x", { tenant: tenantA }))).status).toBe(401);
    state.userId = userA;
    const svg = new FormData();
    svg.set(
      "file",
      new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'], "logo.png", {
        type: "image/png",
      }),
    );
    const res = await (await logo()).POST(
      req("/x", { method: "POST", tenant: tenantA, body: svg }),
    );
    expect(res.status).toBe(400);
    const csv = new FormData();
    csv.set("niche", "n");
    csv.set("location", "l");
    csv.set("source", "csv-import");
    csv.set("file", new File(["foo,bar\n1,2"], "x.csv", { type: "text/csv" }));
    const bad = await (await scans()).POST(
      req("/x", { method: "POST", tenant: tenantA, body: csv }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/business name column/);
  });

  it("omkar-desktop scans are refused with an explicit unavailable message", async () => {
    state.userId = userA;
    const res = await (await scans()).POST(
      req("/x", {
        method: "POST",
        tenant: tenantA,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ niche: "n", location: "l", source: "omkar-desktop" }),
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Source unavailable|UNVERIFIED/);
  });

  describe("territories", () => {
    const territories = () => import("@/app/api/lead-finder/territories/route");
    const territoryById = () => import("@/app/api/lead-finder/territories/[territoryId]/route");
    const zipOutline = () => import("@/app/api/lead-finder/territories/zip-outline/route");
    const drawn = {
      outer: [
        { lat: 38.28, lng: -77.49 },
        { lat: 38.28, lng: -77.44 },
        { lat: 38.33, lng: -77.44 },
        { lat: 38.33, lng: -77.49 },
      ],
      holes: [],
    };
    const json = (method: string, tenant: string, body: unknown) =>
      req("/x", {
        method,
        tenant,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    let territoryA: string;

    beforeAll(async () => {
      state.userId = userA;
      // Drawn areas only: no Census call is needed to save.
      const res = await (await territories()).POST(
        json("POST", tenantA, { name: "A downtown", polygons: [drawn] }),
      );
      expect(res.status).toBe(201);
      territoryA = (await res.json()).territory.id;
    });

    it("tenant A can list, read and scan with its own territory", async () => {
      state.userId = userA;
      const list = await (await territories()).GET(req("/x", { tenant: tenantA }));
      expect((await list.json()).territories.map((t: { name: string }) => t.name)).toEqual([
        "A downtown",
      ]);
      const one = await (await territoryById()).GET(
        req("/x", { tenant: tenantA }),
        p({ territoryId: territoryA }),
      );
      expect(one.status).toBe(200);
      const scan = await (await scans()).POST(
        json("POST", tenantA, {
          niche: "plumbers",
          location: "Fredericksburg VA",
          source: "fixture",
          territoryId: territoryA,
        }),
      );
      expect(scan.status).toBe(201);
      expect((await scan.json()).scan).toMatchObject({
        territoryId: territoryA,
        territoryName: "A downtown",
      });
    });

    it("tenant B cannot read, change, delete or scan with tenant A's territory", async () => {
      state.userId = userB;
      const byHeader = await Promise.all([
        (await territories()).GET(req("/x", { tenant: tenantA })),
        (await territoryById()).GET(req("/x", { tenant: tenantA }), p({ territoryId: territoryA })),
        (await zipOutline()).GET(req("/x?zip=22401", { tenant: tenantA })),
      ]);
      expect(byHeader.map((r) => r.status)).toEqual([403, 403, 403]);

      const byId = await Promise.all([
        (await territoryById()).GET(req("/x", { tenant: tenantB }), p({ territoryId: territoryA })),
        (await territoryById()).PUT(
          json("PUT", tenantB, { name: "Taken over", polygons: [drawn] }),
          p({ territoryId: territoryA }),
        ),
        (await territoryById()).DELETE(
          req("/x", { method: "DELETE", tenant: tenantB }),
          p({ territoryId: territoryA }),
        ),
      ]);
      expect(byId.map((r) => r.status)).toEqual([404, 404, 404]);

      const scan = await (await scans()).POST(
        json("POST", tenantB, {
          niche: "plumbers",
          location: "Fredericksburg VA",
          source: "fixture",
          territoryId: territoryA,
        }),
      );
      expect(scan.status).toBe(400);
      expect((await scan.json()).error).toBe("Territory not found");

      const list = await (await territories()).GET(req("/x", { tenant: tenantB }));
      expect((await list.json()).territories).toEqual([]);

      state.userId = userA;
      const still = await (await territoryById()).GET(
        req("/x", { tenant: tenantA }),
        p({ territoryId: territoryA }),
      );
      expect((await still.json()).territory.name).toBe("A downtown");
    });

    it("rejects bad territory input before calling the Census", async () => {
      state.userId = userA;
      const bad = await Promise.all([
        (await territories()).POST(json("POST", tenantA, { name: "", polygons: [drawn] })),
        (await territories()).POST(json("POST", tenantA, { name: "No area" })),
        (await territories()).POST(
          json("POST", tenantA, { name: "Bad zip", zipCodes: ["2240'1"] }),
        ),
        (await zipOutline()).GET(req("/x?zip=abc", { tenant: tenantA })),
        (await territoryById()).GET(
          req("/x", { tenant: tenantA }),
          p({ territoryId: "not-a-uuid" }),
        ),
      ]);
      expect(bad.map((r) => r.status)).toEqual([400, 400, 400, 400, 404]);
    });

    it("rejects unauthenticated territory requests", async () => {
      state.userId = "";
      const res = await (await territories()).GET(req("/x", { tenant: tenantA }));
      expect(res.status).toBe(401);
    });
  });
});
