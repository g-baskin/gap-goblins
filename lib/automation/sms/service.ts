import { and, eq } from "drizzle-orm";
import { channelAccounts, contactIdentities } from "@/lib/db/schema";
import { db as workerDb } from "@/lib/db/worker";
import type { LeadFinderExecutor } from "@/lib/lead-finder/db";
import type { GraphExternalHandlers } from "../graph/executor";
import type { SmsProvider } from "./provider";

export type SmsProviderResolver = (input: {
  secretReference: string;
  channelAccountId: string;
}) => Promise<SmsProvider>;

type SmsCapabilities = {
  sms?: boolean;
  senderNumber?: string;
  quietHours?: { start: number; end: number };
};
type PhoneMetadata = { smsConsent?: boolean; dnd?: boolean; timezone?: string };

function parseObject<T extends object>(value: unknown): Partial<T> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<T>) : {};
}

export function isQuietHour(
  now: Date,
  timezone: string,
  quietHours: { start: number; end: number } = { start: 20, end: 8 },
): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(now),
  );
  return quietHours.start > quietHours.end
    ? hour >= quietHours.start || hour < quietHours.end
    : hour >= quietHours.start && hour < quietHours.end;
}

/**
 * The one check every SMS send passes (automations and the inbox): an active SMS account with
 * a sender number, a verified phone for the contact with recorded consent, no opt-out, and not
 * inside the contact's quiet hours. Throws with a plain reason when any of these fail.
 */
export async function resolveSmsSendGate(
  input: {
    tenantId: string;
    contactId: string;
    channelAccountId: string;
    now?: Date;
  },
  db: LeadFinderExecutor = workerDb,
) {
  const [[account], [identity]] = await Promise.all([
    db
      .select()
      .from(channelAccounts)
      .where(
        and(
          eq(channelAccounts.id, input.channelAccountId),
          eq(channelAccounts.tenantId, input.tenantId),
          eq(channelAccounts.status, "active"),
        ),
      )
      .limit(1),
    db
      .select()
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, input.tenantId),
          eq(contactIdentities.contactId, input.contactId),
          eq(contactIdentities.type, "phone"),
          eq(contactIdentities.verificationStatus, "verified"),
        ),
      )
      .limit(1),
  ]);
  if (!account?.secretReference) throw new Error("Active SMS account configuration is required");
  const capabilities = parseObject<SmsCapabilities>(account.capabilities);
  if (!capabilities.sms || !capabilities.senderNumber) {
    throw new Error("SMS account capability and sender number are required");
  }
  if (!identity) throw new Error("Verified contact phone identity is required");
  const metadata = parseObject<PhoneMetadata>(identity.metadata);
  if (metadata.smsConsent !== true || metadata.dnd === true) {
    throw new Error("Contact SMS consent is missing or messaging is disabled");
  }
  if (!metadata.timezone) throw new Error("Contact timezone is required for quiet hours");
  if (isQuietHour(input.now ?? new Date(), metadata.timezone, capabilities.quietHours)) {
    throw new Error("SMS blocked during contact quiet hours");
  }
  return {
    account,
    to: identity.normalizedValue,
    from: capabilities.senderNumber,
  };
}

export function createSmsExternalHandler(
  resolveProvider: SmsProviderResolver,
  callbackBaseUrl?: string,
): NonNullable<GraphExternalHandlers["sms"]> {
  return async (input) => {
    const gate = await resolveSmsSendGate({
      tenantId: input.tenantId,
      contactId: input.contactId,
      channelAccountId: input.config.channelAccountId,
    });
    const provider = await resolveProvider({
      secretReference: gate.account.secretReference as string,
      channelAccountId: gate.account.id,
    });
    try {
      const result = await provider.send({
        to: gate.to,
        from: gate.from,
        body: input.config.body,
        statusCallback: callbackBaseUrl
          ? new URL("/api/webhooks/twilio", callbackBaseUrl).toString()
          : undefined,
      });
      return {
        state: "succeeded",
        providerReference: result.providerReference,
        metadata: { provider: provider.name, status: result.status },
      };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : undefined;
      if (code && ["20003", "21211", "21610", "21614"].includes(code)) throw error;
      return { state: "unknown", metadata: { provider: provider.name } };
    }
  };
}
