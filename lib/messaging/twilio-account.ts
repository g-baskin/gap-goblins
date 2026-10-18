/**
 * A workspace's Twilio connection for the conversations inbox: one SMS number per workspace.
 * Stored as a `channel_accounts` row (provider "twilio"); the Auth Token is encrypted in
 * `secret_reference` and never returned to the browser.
 */
import { and, desc, eq, ne, sql } from "drizzle-orm";
import twilio from "twilio";
import { channelAccounts } from "@/lib/db/schema";
import type { LeadFinderExecutor } from "@/lib/lead-finder/db";
import { encryptTwilioCredentials, type TwilioCredentials } from "./credentials";

export const DEFAULT_QUIET_HOURS = { start: 20, end: 8 } as const;

export interface TwilioConnection {
  id: string;
  accountSid: string;
  phoneNumber: string;
  displayName: string;
  status: string;
  updatedAt: string;
}

export interface TwilioAccountRow {
  id: string;
  tenantId: string;
  externalAccountId: string;
  secretReference: string | null;
  senderNumber: string;
}

function senderNumberOf(capabilities: unknown): string | null {
  if (!capabilities || typeof capabilities !== "object") return null;
  const value = (capabilities as Record<string, unknown>).senderNumber;
  return typeof value === "string" ? value : null;
}

function hasSms(capabilities: unknown): boolean {
  return (
    !!capabilities &&
    typeof capabilities === "object" &&
    (capabilities as Record<string, unknown>).sms === true
  );
}

/** The workspace's active Twilio SMS account (the most recently updated one). */
export async function getTwilioAccount(
  db: LeadFinderExecutor,
  tenantId: string,
): Promise<TwilioAccountRow | null> {
  const rows = await db
    .select()
    .from(channelAccounts)
    .where(
      and(
        eq(channelAccounts.tenantId, tenantId),
        eq(channelAccounts.provider, "twilio"),
        eq(channelAccounts.status, "active"),
      ),
    )
    .orderBy(desc(channelAccounts.updatedAt))
    .limit(10);
  for (const row of rows) {
    const senderNumber = senderNumberOf(row.capabilities);
    if (hasSms(row.capabilities) && senderNumber) {
      return {
        id: row.id,
        tenantId: row.tenantId,
        externalAccountId: row.externalAccountId,
        secretReference: row.secretReference,
        senderNumber,
      };
    }
  }
  return null;
}

export async function getTwilioConnection(
  db: LeadFinderExecutor,
  tenantId: string,
): Promise<TwilioConnection | null> {
  const account = await getTwilioAccount(db, tenantId);
  if (!account) return null;
  const [row] = await db
    .select({
      displayName: channelAccounts.displayName,
      status: channelAccounts.status,
      updatedAt: channelAccounts.updatedAt,
    })
    .from(channelAccounts)
    .where(and(eq(channelAccounts.tenantId, tenantId), eq(channelAccounts.id, account.id)))
    .limit(1);
  if (!row) return null;
  return {
    id: account.id,
    accountSid: account.externalAccountId,
    phoneNumber: account.senderNumber,
    displayName: row.displayName,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

/** Checks with Twilio that the credentials work and the number belongs to the account. */
export type TwilioNumberVerifier = (
  credentials: TwilioCredentials,
  phoneNumber: string,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export const verifyTwilioNumber: TwilioNumberVerifier = async (credentials, phoneNumber) => {
  try {
    const client = twilio(credentials.accountSid, credentials.authToken, { timeout: 10_000 });
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber, limit: 1 });
    const match = numbers.find((number) => number.phoneNumber === phoneNumber);
    if (!match) {
      return { ok: false, error: "That phone number is not in this Twilio account" };
    }
    if (match.capabilities?.sms === false) {
      return { ok: false, error: "That Twilio number cannot send text messages" };
    }
    return { ok: true };
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status;
    if (status === 401 || status === 403) {
      return { ok: false, error: "Twilio rejected the Account SID or Auth Token" };
    }
    return { ok: false, error: "Could not reach Twilio. Try again shortly." };
  }
};

export type ConnectResult =
  | { ok: true; connection: TwilioConnection }
  | { ok: false; error: string; status: 400 | 409 | 502 };

/** Connects (or reconnects) Twilio for a workspace after Twilio confirms the number. */
export async function connectTwilio(
  db: LeadFinderExecutor,
  tenantId: string,
  input: { accountSid: string; authToken: string; phoneNumber: string },
  verify: TwilioNumberVerifier = verifyTwilioNumber,
): Promise<ConnectResult> {
  const credentials = { accountSid: input.accountSid.trim(), authToken: input.authToken.trim() };
  const phoneNumber = input.phoneNumber;

  // One workspace per number, so an incoming text can only ever reach one workspace.
  const [taken] = await db
    .select({ id: channelAccounts.id })
    .from(channelAccounts)
    .where(
      and(
        eq(channelAccounts.provider, "twilio"),
        eq(channelAccounts.status, "active"),
        ne(channelAccounts.tenantId, tenantId),
        sql`${channelAccounts.capabilities}->>'senderNumber' = ${phoneNumber}`,
      ),
    )
    .limit(1);
  if (taken) {
    return {
      ok: false,
      status: 409,
      error: "That number is already connected to another workspace",
    };
  }

  const verified = await verify(credentials, phoneNumber);
  if (!verified.ok) {
    return {
      ok: false,
      status: verified.error.startsWith("Could not reach") ? 502 : 400,
      error: verified.error,
    };
  }

  const now = new Date().toISOString();
  const values = {
    displayName: `Twilio ${phoneNumber}`,
    capabilities: { sms: true, senderNumber: phoneNumber, quietHours: DEFAULT_QUIET_HOURS },
    status: "active",
    secretReference: encryptTwilioCredentials(credentials),
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    // Only one active inbox number per workspace: retire any other Twilio account first.
    await tx
      .update(channelAccounts)
      .set({ status: "disconnected", updatedAt: now })
      .where(
        and(
          eq(channelAccounts.tenantId, tenantId),
          eq(channelAccounts.provider, "twilio"),
          ne(channelAccounts.externalAccountId, credentials.accountSid),
        ),
      );
    await tx
      .insert(channelAccounts)
      .values({
        tenantId,
        provider: "twilio",
        externalAccountId: credentials.accountSid,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          channelAccounts.tenantId,
          channelAccounts.provider,
          channelAccounts.externalAccountId,
        ],
        set: values,
      });
  });
  const connection = await getTwilioConnection(db, tenantId);
  if (!connection) throw new Error("Twilio connection was not saved");
  return { ok: true, connection };
}

/** Disconnects Twilio. Past conversations stay; the stored token is erased. */
export async function disconnectTwilio(db: LeadFinderExecutor, tenantId: string): Promise<boolean> {
  const rows = await db
    .update(channelAccounts)
    .set({ status: "disconnected", secretReference: null, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(channelAccounts.tenantId, tenantId),
        eq(channelAccounts.provider, "twilio"),
        eq(channelAccounts.status, "active"),
      ),
    )
    .returning({ id: channelAccounts.id });
  return rows.length > 0;
}
