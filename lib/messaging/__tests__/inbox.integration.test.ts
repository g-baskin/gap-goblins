// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getExpectedTwilioSignature } from "twilio";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RecordingSmsProvider } from "@/lib/automation/sms/provider";
import * as schema from "@/lib/db/schema";
import {
  closeTestDb,
  createTenant,
  getTestDb,
} from "@/lib/lead-finder/__tests__/integration/harness";
import type { LeadFinderDb } from "@/lib/lead-finder/db";

const state = vi.hoisted(() => ({ db: null as LeadFinderDb | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return state.db;
  },
}));

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
  process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("hex");
}

const db = (await getTestDb()) as LeadFinderDb;
state.db = db;
const suite = db ? describe : describe.skip;

const { processTwilioWebhook } = await import("@/lib/automation/sms/webhook");
const { encryptTwilioCredentials, resolveTwilioCredentials } = await import("../credentials");
const inbox = await import("../inbox");
const { sendInboxSms } = await import("../send");
const { connectTwilio, disconnectTwilio, getTwilioAccount, getTwilioConnection } = await import(
  "../twilio-account"
);

afterAll(async () => {
  await closeTestDb();
});

const WEBHOOK_URL = "https://gg.example.test/api/webhooks/twilio";
const hex32 = () => randomBytes(16).toString("hex");
let numberSeq = 1000 + Math.floor(Math.random() * 8000);
const nextNumber = () => `+1540555${String(numberSeq++).padStart(4, "0")}`;

interface Workspace {
  tenantId: string;
  accountSid: string;
  authToken: string;
  number: string;
  channelAccountId: string;
}

async function workspace(label: string): Promise<Workspace> {
  const tenantId = await createTenant(db, label);
  const accountSid = `AC${hex32()}`;
  const authToken = hex32();
  const number = nextNumber();
  const result = await connectTwilio(
    db,
    tenantId,
    { accountSid, authToken, phoneNumber: number },
    async () => ({ ok: true }),
  );
  if (!result.ok) throw new Error(result.error);
  return { tenantId, accountSid, authToken, number, channelAccountId: result.connection.id };
}

/** Delivers a correctly signed Twilio webhook, like Twilio itself would. */
function deliver(ws: Workspace, params: Record<string, string>, token = ws.authToken) {
  const full = { AccountSid: ws.accountSid, ...params };
  const signature = getExpectedTwilioSignature(token, WEBHOOK_URL, full);
  return processTwilioWebhook({ signature, url: WEBHOOK_URL, params: full });
}

function incoming(ws: Workspace, from: string, body: string) {
  return deliver(ws, {
    MessageSid: `SM${hex32()}`,
    SmsStatus: "received",
    From: from,
    To: ws.number,
    Body: body,
    NumMedia: "0",
  });
}

async function threadFor(ws: Workspace, phone: string) {
  const threads = await inbox.listThreads(db, ws.tenantId, { query: phone });
  const thread = threads.find((t) => t.phone === phone);
  if (!thread) throw new Error(`no thread for ${phone}`);
  return thread;
}

/** 2pm in New York: always outside quiet hours. */
const AFTERNOON = new Date("2026-10-12T18:00:00Z");
/** 11pm in New York: inside quiet hours. */
const NIGHT = new Date("2026-10-13T03:00:00Z");

suite("Twilio credentials", () => {
  it("stores the Auth Token encrypted and reads it back", () => {
    const credentials = { accountSid: `AC${hex32()}`, authToken: hex32() };
    const sealed = encryptTwilioCredentials(credentials);
    expect(sealed.startsWith("enc:v1:")).toBe(true);
    expect(sealed).not.toContain(credentials.authToken);
    expect(resolveTwilioCredentials(sealed)).toEqual(credentials);
  });

  it("rejects tampered or unknown secret references", () => {
    const sealed = encryptTwilioCredentials({ accountSid: `AC${hex32()}`, authToken: hex32() });
    const tampered = `${sealed.slice(0, -4)}AAAA`;
    expect(resolveTwilioCredentials(tampered)).toBeNull();
    expect(resolveTwilioCredentials("plain-text-token")).toBeNull();
    expect(resolveTwilioCredentials(null)).toBeNull();
  });

  it("still reads the original env: references", () => {
    const credentials = { accountSid: `AC${hex32()}`, authToken: hex32() };
    expect(
      resolveTwilioCredentials("env:TWILIO_TEST", { TWILIO_TEST: JSON.stringify(credentials) }),
    ).toEqual(credentials);
  });
});

suite("connecting Twilio", () => {
  it("never returns the Auth Token, and disconnecting erases it", async () => {
    const ws = await workspace("sms-connect");
    const connection = await getTwilioConnection(db, ws.tenantId);
    expect(connection).toMatchObject({ accountSid: ws.accountSid, phoneNumber: ws.number });
    expect(JSON.stringify(connection)).not.toContain(ws.authToken);

    expect(await disconnectTwilio(db, ws.tenantId)).toBe(true);
    expect(await getTwilioAccount(db, ws.tenantId)).toBeNull();
    const [row] = await db
      .select({ secret: schema.channelAccounts.secretReference })
      .from(schema.channelAccounts)
      .where(eq(schema.channelAccounts.id, ws.channelAccountId));
    expect(row?.secret).toBeNull();
  });

  it("refuses a number already connected to another workspace", async () => {
    const a = await workspace("sms-num-a");
    const b = await createTenant(db, "sms-num-b");
    const result = await connectTwilio(
      db,
      b,
      { accountSid: `AC${hex32()}`, authToken: hex32(), phoneNumber: a.number },
      async () => ({ ok: true }),
    );
    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  it("does not save when Twilio rejects the credentials", async () => {
    const tenantId = await createTenant(db, "sms-bad-creds");
    const result = await connectTwilio(
      db,
      tenantId,
      { accountSid: `AC${hex32()}`, authToken: hex32(), phoneNumber: nextNumber() },
      async () => ({ ok: false, error: "Twilio rejected the Account SID or Auth Token" }),
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(await getTwilioAccount(db, tenantId)).toBeNull();
  });
});

suite("incoming texts", () => {
  it("files a signed incoming text under a new contact and conversation, unread", async () => {
    const ws = await workspace("sms-in");
    const from = nextNumber();
    await incoming(ws, from, "Hi, do you have openings this week?");

    const thread = await threadFor(ws, from);
    expect(thread).toMatchObject({
      unreadCount: 1,
      preview: "Hi, do you have openings this week?",
      channel: "sms",
    });
    const detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.messages).toMatchObject([
      { direction: "inbound", status: "received", body: "Hi, do you have openings this week?" },
    ]);
    // Texting in proves the number, but is not consent to receive marketing texts.
    expect(detail?.consent).toMatchObject({ consent: false, optedOut: false });
  });

  it("puts a second text from the same number in the same conversation", async () => {
    const ws = await workspace("sms-in-2");
    const from = nextNumber();
    await incoming(ws, from, "First");
    await incoming(ws, from, "Second");
    const threads = await inbox.listThreads(db, ws.tenantId);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ unreadCount: 2, preview: "Second" });
  });

  it("ignores a replayed webhook", async () => {
    const ws = await workspace("sms-replay");
    const from = nextNumber();
    const params = {
      MessageSid: `SM${hex32()}`,
      SmsStatus: "received",
      From: from,
      To: ws.number,
      Body: "Once",
    };
    await deliver(ws, params);
    const replay = await deliver(ws, params);
    expect(replay.duplicate).toBe(true);
    const detail = await inbox.getThread(db, ws.tenantId, (await threadFor(ws, from)).id);
    expect(detail?.messages).toHaveLength(1);
  });

  it("rejects a webhook with a bad signature and stores nothing", async () => {
    const ws = await workspace("sms-badsig");
    const from = nextNumber();
    await expect(
      deliver(
        ws,
        { MessageSid: `SM${hex32()}`, SmsStatus: "received", From: from, To: ws.number, Body: "x" },
        hex32(),
      ),
    ).rejects.toThrow(/signature/i);
    expect(await inbox.listThreads(db, ws.tenantId)).toEqual([]);
  });

  it("only the workspace that owns the number receives the text", async () => {
    const a = await workspace("sms-route-a");
    const b = await workspace("sms-route-b");
    const from = nextNumber();
    await incoming(a, from, "For A");
    expect(await inbox.listThreads(db, a.tenantId)).toHaveLength(1);
    expect(await inbox.listThreads(db, b.tenantId)).toEqual([]);
  });
});

suite("sending from the inbox", () => {
  async function consentedThread(ws: Workspace) {
    const from = nextNumber();
    await incoming(ws, from, "Please text me back");
    const thread = await threadFor(ws, from);
    const detail = await inbox.getThread(db, ws.tenantId, thread.id);
    if (!detail) throw new Error("missing thread");
    await inbox.setSmsConsent(db, ws.tenantId, detail.contactId, {
      consent: true,
      source: "Contact texted us first",
      timezone: "America/New_York",
      recordedBy: null,
    });
    return { thread, phone: from };
  }

  it("blocks sending until consent is recorded", async () => {
    const ws = await workspace("sms-noconsent");
    const from = nextNumber();
    await incoming(ws, from, "hello");
    const thread = await threadFor(ws, from);
    const provider = new RecordingSmsProvider();
    const result = await sendInboxSms(
      db,
      {
        tenantId: ws.tenantId,
        threadId: thread.id,
        userId: randomUUID(),
        body: "Thanks!",
        idempotencyKey: randomUUID(),
        now: AFTERNOON,
      },
      () => provider,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 422,
      error: expect.stringMatching(/consent/i),
    });
    expect(provider.requests).toEqual([]);
  });

  it("sends with consent, from the workspace number to the contact", async () => {
    const ws = await workspace("sms-send");
    const { thread, phone } = await consentedThread(ws);
    const provider = new RecordingSmsProvider();
    const result = await sendInboxSms(
      db,
      {
        tenantId: ws.tenantId,
        threadId: thread.id,
        userId: randomUUID(),
        body: "  We have Thursday at 2pm.  ",
        idempotencyKey: randomUUID(),
        now: AFTERNOON,
      },
      () => provider,
    );
    expect(result).toMatchObject({ ok: true, status: "sent", duplicate: false });
    expect(provider.requests).toEqual([
      expect.objectContaining({ to: phone, from: ws.number, body: "We have Thursday at 2pm." }),
    ]);
    const detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.messages.at(-1)).toMatchObject({
      direction: "outbound",
      status: "sent",
      body: "We have Thursday at 2pm.",
    });
  });

  it("refuses to send during the contact's quiet hours", async () => {
    const ws = await workspace("sms-quiet");
    const { thread } = await consentedThread(ws);
    const provider = new RecordingSmsProvider();
    const result = await sendInboxSms(
      db,
      {
        tenantId: ws.tenantId,
        threadId: thread.id,
        userId: randomUUID(),
        body: "Late night text",
        idempotencyKey: randomUUID(),
        now: NIGHT,
      },
      () => provider,
    );
    expect(result).toMatchObject({
      ok: false,
      status: 422,
      error: expect.stringMatching(/quiet hours/),
    });
    expect(provider.requests).toEqual([]);
  });

  it("a double-click with the same key texts the contact only once", async () => {
    const ws = await workspace("sms-idem");
    const { thread } = await consentedThread(ws);
    const provider = new RecordingSmsProvider();
    const input = {
      tenantId: ws.tenantId,
      threadId: thread.id,
      userId: randomUUID(),
      body: "Only once",
      idempotencyKey: randomUUID(),
      now: AFTERNOON,
    };
    const first = await sendInboxSms(db, input, () => provider);
    const second = await sendInboxSms(db, input, () => provider);
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(second.ok && first.ok && second.messageId).toBe(first.ok && first.messageId);
    expect(provider.requests).toHaveLength(1);
  });

  it("marks a message delivered or failed from Twilio's status updates", async () => {
    const ws = await workspace("sms-status");
    const { thread, phone } = await consentedThread(ws);
    const provider = new RecordingSmsProvider();
    const sent = await sendInboxSms(
      db,
      {
        tenantId: ws.tenantId,
        threadId: thread.id,
        userId: randomUUID(),
        body: "Status check",
        idempotencyKey: randomUUID(),
        now: AFTERNOON,
      },
      () => provider,
    );
    expect(sent.ok).toBe(true);
    const sid = "recording-1";
    await deliver(ws, { MessageSid: sid, MessageStatus: "delivered", From: ws.number, To: phone });
    let detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.messages.at(-1)).toMatchObject({ status: "delivered" });

    await deliver(ws, {
      MessageSid: sid,
      MessageStatus: "undelivered",
      From: ws.number,
      To: phone,
      ErrorCode: "30007",
    });
    detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.messages.at(-1)).toMatchObject({
      status: "failed",
      error: "Twilio error 30007",
    });
  });

  it("STOP opts the contact out immediately and later sends are blocked; START opts back in", async () => {
    const ws = await workspace("sms-stop");
    const { thread, phone } = await consentedThread(ws);
    await incoming(ws, phone, "  stop ");
    let detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.consent).toMatchObject({ consent: false, optedOut: true });

    const provider = new RecordingSmsProvider();
    const blocked = await sendInboxSms(
      db,
      {
        tenantId: ws.tenantId,
        threadId: thread.id,
        userId: randomUUID(),
        body: "Are you sure?",
        idempotencyKey: randomUUID(),
        now: AFTERNOON,
      },
      () => provider,
    );
    expect(blocked).toMatchObject({
      ok: false,
      status: 422,
      error: expect.stringMatching(/opted out/),
    });
    expect(provider.requests).toEqual([]);

    await incoming(ws, phone, "START");
    detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.consent).toMatchObject({ consent: true, optedOut: false });
  });

  it.each([
    "UNSUBSCRIBE",
    "Cancel",
    "END",
    "quit",
    "stop all",
  ])("%s also opts the contact out", async (keyword) => {
    const ws = await workspace("sms-optout-word");
    const { thread, phone } = await consentedThread(ws);
    await incoming(ws, phone, keyword);
    const detail = await inbox.getThread(db, ws.tenantId, thread.id);
    expect(detail?.consent.optedOut).toBe(true);
  });
});

suite("inbox views and workspace isolation", () => {
  let a: Workspace;
  let b: Workspace;
  let threadA: string;

  beforeAll(async () => {
    a = await workspace("sms-iso-a");
    b = await workspace("sms-iso-b");
    const from = nextNumber();
    await incoming(a, from, "Private to A");
    threadA = (await threadFor(a, from)).id;
  });

  it("filters unread and starred, and opening marks it read", async () => {
    expect(await inbox.listThreads(db, a.tenantId, { filter: "unread" })).toHaveLength(1);
    await inbox.updateThread(db, a.tenantId, threadA, { read: true, starred: true });
    expect(await inbox.listThreads(db, a.tenantId, { filter: "unread" })).toEqual([]);
    expect(
      (await inbox.listThreads(db, a.tenantId, { filter: "starred" })).map((t) => t.id),
    ).toEqual([threadA]);
  });

  it("searches by message text and by name, treating % and _ literally", async () => {
    expect(await inbox.listThreads(db, a.tenantId, { query: "private to" })).toHaveLength(1);
    expect(await inbox.listThreads(db, a.tenantId, { query: "%" })).toEqual([]);
  });

  it("workspace B cannot read, change, record consent for, or text A's conversation", async () => {
    expect(await inbox.getThread(db, b.tenantId, threadA)).toBeNull();
    expect(await inbox.listThreads(db, b.tenantId)).toEqual([]);
    expect(await inbox.updateThread(db, b.tenantId, threadA, { starred: false })).toBe(false);

    const detailA = await inbox.getThread(db, a.tenantId, threadA);
    expect(
      await inbox.setSmsConsent(db, b.tenantId, detailA?.contactId ?? "", {
        consent: true,
        source: "Web form opt-in",
        timezone: "America/New_York",
        recordedBy: null,
      }),
    ).toBe(false);

    const provider = new RecordingSmsProvider();
    const result = await sendInboxSms(
      db,
      {
        tenantId: b.tenantId,
        threadId: threadA,
        userId: randomUUID(),
        body: "Not yours",
        idempotencyKey: randomUUID(),
        now: AFTERNOON,
      },
      () => provider,
    );
    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(provider.requests).toEqual([]);

    const stillA = await inbox.getThread(db, a.tenantId, threadA);
    expect(stillA).toMatchObject({ starred: true });
    expect(stillA?.consent.consent).toBe(false);
  });

  it("the database refuses a message on another workspace's thread", async () => {
    const detailA = await inbox.getThread(db, a.tenantId, threadA);
    await expect(
      db.insert(schema.communicationEvents).values({
        tenantId: b.tenantId,
        threadId: threadA,
        contactId: detailA?.contactId ?? randomUUID(),
        channel: "sms",
        kind: "message",
        direction: "outbound",
        status: "sent",
        occurredAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
    const count = await db
      .select({ id: schema.communicationEvents.id })
      .from(schema.communicationEvents)
      .where(
        and(
          eq(schema.communicationEvents.tenantId, a.tenantId),
          eq(schema.communicationEvents.threadId, threadA),
        ),
      );
    expect(count).toHaveLength(1);
  });
});
