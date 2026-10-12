/**
 * Sends an SMS reply from the inbox. Every send passes the shared SMS gate
 * (lib/automation/sms/service.ts): recorded consent, no opt-out, quiet hours in the contact's
 * timezone, and an active Twilio number. A client-supplied idempotency key makes a double-click
 * or retry return the first result instead of texting the contact twice.
 */
import { and, eq } from "drizzle-orm";
import type { SmsProvider } from "@/lib/automation/sms/provider";
import { TwilioSmsProvider } from "@/lib/automation/sms/provider";
import { resolveSmsSendGate } from "@/lib/automation/sms/service";
import { communicationEvents, conversationThreads, outboundOperations } from "@/lib/db/schema";
import type { LeadFinderExecutor } from "@/lib/lead-finder/db";
import { resolveTwilioCredentials } from "./credentials";
import { appendMessage } from "./inbox";
import { getTwilioAccount } from "./twilio-account";

export const SMS_MAX_LENGTH = 1600;

export type ProviderFactory = (account: { secretReference: string | null }) => SmsProvider | null;

export const twilioProviderFactory: ProviderFactory = (account) => {
  const credentials = resolveTwilioCredentials(account.secretReference);
  return credentials ? new TwilioSmsProvider(credentials.accountSid, credentials.authToken) : null;
};

export type SendResult =
  | { ok: true; messageId: string; status: string; duplicate: boolean }
  | { ok: false; status: 400 | 404 | 409 | 422 | 502; error: string };

/** Twilio error codes that mean "this number cannot be texted", shown in plain words. */
const TWILIO_ERRORS: Record<string, string> = {
  "21610": "This contact replied STOP, so Twilio blocks texts to them",
  "21211": "That phone number is not valid",
  "21614": "That number cannot receive text messages",
  "21408": "Your Twilio account is not allowed to text this region",
  "30034": "Carriers blocked this message: your A2P 10DLC registration is not approved yet",
};

function publicStatusCallback(): string | undefined {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  // Twilio can only call back a public https address.
  if (!base?.startsWith("https://")) return undefined;
  return new URL("/api/webhooks/twilio", base).toString();
}

export async function sendInboxSms(
  db: LeadFinderExecutor,
  input: {
    tenantId: string;
    threadId: string;
    userId: string;
    body: string;
    idempotencyKey: string;
    now?: Date;
  },
  providerFactory: ProviderFactory = twilioProviderFactory,
): Promise<SendResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, status: 400, error: "Type a message first" };
  if (body.length > SMS_MAX_LENGTH) {
    return { ok: false, status: 400, error: `Texts can be at most ${SMS_MAX_LENGTH} characters` };
  }
  const [thread] = await db
    .select({ id: conversationThreads.id, contactId: conversationThreads.contactId })
    .from(conversationThreads)
    .where(
      and(
        eq(conversationThreads.tenantId, input.tenantId),
        eq(conversationThreads.id, input.threadId),
        eq(conversationThreads.channel, "sms"),
      ),
    )
    .limit(1);
  if (!thread) return { ok: false, status: 404, error: "Conversation not found" };

  const account = await getTwilioAccount(db, input.tenantId);
  if (!account) {
    return {
      ok: false,
      status: 409,
      error: "Connect a Twilio number in Settings → Messaging first",
    };
  }

  const scopedKey = `inbox-sms:${input.threadId}:${input.idempotencyKey}`;
  const [previous] = await db
    .select({
      eventId: outboundOperations.eventId,
      status: outboundOperations.status,
      error: outboundOperations.terminalError,
    })
    .from(outboundOperations)
    .where(
      and(
        eq(outboundOperations.tenantId, input.tenantId),
        eq(outboundOperations.channelAccountId, account.id),
        eq(outboundOperations.idempotencyKey, scopedKey),
      ),
    )
    .limit(1);
  if (previous) {
    if (!previous.eventId) {
      return { ok: false, status: 409, error: previous.error ?? "This message is already sending" };
    }
    const [event] = await db
      .select({ status: communicationEvents.status })
      .from(communicationEvents)
      .where(
        and(
          eq(communicationEvents.tenantId, input.tenantId),
          eq(communicationEvents.id, previous.eventId),
        ),
      )
      .limit(1);
    return {
      ok: true,
      messageId: previous.eventId,
      status: event?.status ?? previous.status,
      duplicate: true,
    };
  }

  let gate: Awaited<ReturnType<typeof resolveSmsSendGate>>;
  try {
    gate = await resolveSmsSendGate(
      {
        tenantId: input.tenantId,
        contactId: thread.contactId,
        channelAccountId: account.id,
        now: input.now,
      },
      db,
    );
  } catch (error) {
    return { ok: false, status: 422, error: gateMessage(error) };
  }

  const provider = providerFactory(account);
  if (!provider) {
    return {
      ok: false,
      status: 409,
      error: "Twilio credentials are unreadable. Reconnect Twilio.",
    };
  }

  const now = new Date().toISOString();
  const [operation] = await db
    .insert(outboundOperations)
    .values({
      tenantId: input.tenantId,
      channelAccountId: account.id,
      operationType: "sms.send",
      idempotencyKey: scopedKey,
      status: "pending",
      payload: { threadId: input.threadId, to: gate.to },
      attempts: 1,
    })
    .onConflictDoNothing()
    .returning({ id: outboundOperations.id });
  if (!operation) {
    return { ok: false, status: 409, error: "This message is already sending" };
  }

  let providerReference: string;
  try {
    const result = await provider.send({
      to: gate.to,
      from: gate.from,
      body,
      statusCallback: publicStatusCallback(),
    });
    providerReference = result.providerReference;
  } catch (error) {
    const code = String((error as { code?: unknown } | null)?.code ?? "");
    const message = TWILIO_ERRORS[code] ?? "Twilio could not send this message";
    await db
      .update(outboundOperations)
      .set({ status: "failed", terminalError: message, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(outboundOperations.tenantId, input.tenantId),
          eq(outboundOperations.id, operation.id),
        ),
      );
    return { ok: false, status: 502, error: message };
  }

  const messageId = await appendMessage(db, {
    tenantId: input.tenantId,
    threadId: input.threadId,
    contactId: thread.contactId,
    channelAccountId: account.id,
    direction: "outbound",
    status: "sent",
    body,
    occurredAt: now,
    actorId: input.userId,
    channelData: { messageSid: providerReference, provider: provider.name },
  });
  await db
    .update(outboundOperations)
    .set({
      status: "succeeded",
      eventId: messageId,
      externalReference: providerReference,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(outboundOperations.tenantId, input.tenantId), eq(outboundOperations.id, operation.id)),
    );
  return { ok: true, messageId, status: "sent", duplicate: false };
}

/** The shared gate throws technical messages; turn them into what the team should do. */
function gateMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("consent is missing")) {
    return "This contact has no recorded texting consent, or opted out. Record consent first.";
  }
  if (message.includes("Verified contact phone")) {
    return "Record this contact's texting consent before sending.";
  }
  if (message.includes("timezone"))
    return "Record the contact's timezone with their consent first.";
  if (message.includes("quiet hours")) {
    return "It is quiet hours for this contact (8pm to 8am their time). Try again later.";
  }
  if (message.includes("sender number") || message.includes("Active SMS account")) {
    return "Connect a Twilio number in Settings → Messaging first";
  }
  return "This message cannot be sent";
}
