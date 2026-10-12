// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  closeTestDb,
  createTenant,
  getTestDb,
} from "@/lib/lead-finder/__tests__/integration/harness";
import type { LeadFinderDb } from "@/lib/lead-finder/db";

const state = vi.hoisted(() => ({ db: null as LeadFinderDb | null, userId: "" }));
vi.mock("@/lib/db", () => ({
  get db() {
    return state.db;
  },
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => (state.userId ? { user: { id: state.userId, role: "admin" } } : null),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ success: true }),
}));

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
  process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("hex");
}

const db = (await getTestDb()) as LeadFinderDb;
state.db = db;
const suite = db ? describe : describe.skip;

afterAll(async () => {
  await closeTestDb();
});

const conversations = () => import("@/app/api/conversations/route");
const thread = () => import("@/app/api/conversations/[threadId]/route");
const messages = () => import("@/app/api/conversations/[threadId]/messages/route");
const consent = () => import("@/app/api/conversations/[threadId]/consent/route");
const twilioSettings = () => import("@/app/api/settings/messaging/twilio/route");

function req(init: RequestInit & { tenant?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.tenant) headers.set("x-tenant-id", init.tenant);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  return new Request("http://localhost/x", {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}
const p = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

async function user(tenantId: string, role = "owner") {
  const [row] = await db
    .insert(schema.adminUsers)
    .values({
      email: `sms-route-${randomUUID()}@test.local`,
      passwordHash: "x",
      role: "admin",
      isActive: true,
    })
    .returning({ id: schema.adminUsers.id });
  if (!row) throw new Error("no user");
  await db.insert(schema.tenantMemberships).values({ tenantId, userId: row.id, role });
  return row.id;
}

suite("conversation and messaging routes", () => {
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let threadA: string;

  beforeAll(async () => {
    tenantA = await createTenant(db, "sms-routes-a");
    tenantB = await createTenant(db, "sms-routes-b");
    userA = await user(tenantA);
    userB = await user(tenantB);
    state.userId = userA;
    const res = await (await conversations()).POST(
      req({ method: "POST", tenant: tenantA, json: { phone: "(540) 555-0142", name: "Pat" } }),
    );
    expect(res.status).toBe(201);
    threadA = (await res.json()).threadId;
  });

  it("tenant A lists and opens its conversation; no Twilio means texting is off", async () => {
    state.userId = userA;
    const list = await (await conversations()).GET(req({ tenant: tenantA }));
    const body = await list.json();
    expect(body.sms).toEqual({ connected: false });
    expect(body.threads).toMatchObject([
      { id: threadA, contactName: "Pat", phone: "+15405550142" },
    ]);

    const one = await (await thread()).GET(req({ tenant: tenantA }), p({ threadId: threadA }));
    expect(one.status).toBe(200);
    expect((await one.json()).thread.consent).toMatchObject({ consent: false });

    const send = await (await messages()).POST(
      req({ method: "POST", tenant: tenantA, json: { body: "hi", idempotencyKey: randomUUID() } }),
      p({ threadId: threadA }),
    );
    expect(send.status).toBe(409);
    expect((await send.json()).error).toMatch(/Connect a Twilio number/);
  });

  it("opening the same number again reuses the conversation", async () => {
    state.userId = userA;
    const res = await (await conversations()).POST(
      req({ method: "POST", tenant: tenantA, json: { phone: "+1 540 555 0142" } }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).threadId).toBe(threadA);
  });

  it("tenant B cannot see, change, record consent for or text tenant A's conversation", async () => {
    state.userId = userB;
    const viaHeader = await Promise.all([
      (await conversations()).GET(req({ tenant: tenantA })),
      (await thread()).GET(req({ tenant: tenantA }), p({ threadId: threadA })),
      (await twilioSettings()).GET(req({ tenant: tenantA })),
    ]);
    expect(viaHeader.map((r) => r.status)).toEqual([403, 403, 403]);

    const viaId = await Promise.all([
      (await thread()).GET(req({ tenant: tenantB }), p({ threadId: threadA })),
      (await thread()).PATCH(
        req({ method: "PATCH", tenant: tenantB, json: { starred: true } }),
        p({ threadId: threadA }),
      ),
      (await consent()).PUT(
        req({
          method: "PUT",
          tenant: tenantB,
          json: { source: "Web form opt-in", timezone: "America/New_York" },
        }),
        p({ threadId: threadA }),
      ),
      (await consent()).DELETE(
        req({ method: "DELETE", tenant: tenantB }),
        p({ threadId: threadA }),
      ),
      (await messages()).POST(
        req({ method: "POST", tenant: tenantB, json: { body: "x", idempotencyKey: randomUUID() } }),
        p({ threadId: threadA }),
      ),
    ]);
    expect(viaId.map((r) => r.status)).toEqual([404, 404, 404, 404, 404]);

    const listB = await (await conversations()).GET(req({ tenant: tenantB }));
    expect((await listB.json()).threads).toEqual([]);

    state.userId = userA;
    const still = await (await thread()).GET(req({ tenant: tenantA }), p({ threadId: threadA }));
    expect((await still.json()).thread).toMatchObject({
      starred: false,
      consent: { consent: false },
    });
  });

  it("records consent with a source and timezone, and rejects made-up values", async () => {
    state.userId = userA;
    const bad = await Promise.all([
      (await consent()).PUT(
        req({
          method: "PUT",
          tenant: tenantA,
          json: { source: "They seemed keen", timezone: "America/New_York" },
        }),
        p({ threadId: threadA }),
      ),
      (await consent()).PUT(
        req({
          method: "PUT",
          tenant: tenantA,
          json: { source: "Web form opt-in", timezone: "Mars/Base" },
        }),
        p({ threadId: threadA }),
      ),
    ]);
    expect(bad.map((r) => r.status)).toEqual([400, 400]);

    const ok = await (await consent()).PUT(
      req({
        method: "PUT",
        tenant: tenantA,
        json: { source: "Web form opt-in", timezone: "America/Chicago" },
      }),
      p({ threadId: threadA }),
    );
    expect(ok.status).toBe(200);
    const one = await (await thread()).GET(req({ tenant: tenantA }), p({ threadId: threadA }));
    expect((await one.json()).thread.consent).toMatchObject({
      consent: true,
      optedOut: false,
      source: "Web form opt-in",
      timezone: "America/Chicago",
    });
  });

  it("rejects bad input", async () => {
    state.userId = userA;
    const results = await Promise.all([
      (await conversations()).POST(req({ method: "POST", tenant: tenantA, json: { phone: "12" } })),
      (await messages()).POST(
        req({
          method: "POST",
          tenant: tenantA,
          json: { body: "x".repeat(1601), idempotencyKey: randomUUID() },
        }),
        p({ threadId: threadA }),
      ),
      (await messages()).POST(
        req({
          method: "POST",
          tenant: tenantA,
          json: { body: "hi", idempotencyKey: "not-a-uuid" },
        }),
        p({ threadId: threadA }),
      ),
      (await thread()).GET(req({ tenant: tenantA }), p({ threadId: "not-a-uuid" })),
      (await twilioSettings()).PUT(
        req({
          method: "PUT",
          tenant: tenantA,
          json: { accountSid: "bad", authToken: "x", phoneNumber: "1" },
        }),
      ),
    ]);
    expect(results.map((r) => r.status)).toEqual([400, 400, 400, 404, 400]);
  });

  it("only workspace owners and admins can change the Twilio connection", async () => {
    const member = await user(tenantA, "agent");
    state.userId = member;
    const res = await (await twilioSettings()).DELETE(req({ method: "DELETE", tenant: tenantA }));
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    state.userId = "";
    const results = await Promise.all([
      (await conversations()).GET(req({ tenant: tenantA })),
      (await thread()).GET(req({ tenant: tenantA }), p({ threadId: threadA })),
      (await twilioSettings()).GET(req({ tenant: tenantA })),
    ]);
    expect(results.map((r) => r.status)).toEqual([401, 401, 401]);
  });
});
