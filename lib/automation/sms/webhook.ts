import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { validateRequest } from "twilio";
import type { CommunicationStatus } from "@/lib/conversations/domain";
import { db } from "@/lib/db";
import {
  automationActionOperations,
  automationEnrollments,
  automationNodeRuns,
  channelAccounts,
  contactIdentities,
  providerWebhookEvents,
} from "@/lib/db/schema";
import { resolveTwilioCredentials } from "@/lib/messaging/credentials";
import {
  appendMessage,
  findOrCreateContactByPhone,
  findOrCreateOpenThread,
  updateMessageStatus,
} from "@/lib/messaging/inbox";

/** Carrier-standard opt-out and opt-in keywords (Twilio Advanced Opt-Out defaults). */
const OPT_OUT_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "STOP ALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "OPTOUT",
  "OPT OUT",
  "REVOKE",
]);
const OPT_IN_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);
const E164 = /^\+[1-9]\d{7,14}$/;

/** Maps a Twilio message status to the inbox status; null when it is not worth showing. */
export function twilioInboxStatus(status: string): CommunicationStatus | null {
  const normalized = status.toLowerCase();
  if (normalized === "sent") return "sent";
  if (normalized === "delivered") return "delivered";
  if (normalized === "read") return "read";
  if (normalized === "failed" || normalized === "undelivered") return "failed";
  return null;
}

function senderNumberOf(capabilities: unknown): string | null {
  if (!capabilities || typeof capabilities !== "object") return null;
  const value = (capabilities as Record<string, unknown>).senderNumber;
  return typeof value === "string" ? value : null;
}

export function twilioOperationState(status: string): "succeeded" | "failed" | null {
  const normalized = status.toLowerCase();
  if (["delivered", "read"].includes(normalized)) return "succeeded";
  if (["failed", "undelivered"].includes(normalized)) return "failed";
  return null;
}

export async function processTwilioWebhook(input: {
  signature: string;
  url: string;
  params: Record<string, string>;
}) {
  const accountSid = input.params.AccountSid;
  if (!accountSid) throw new Error("Missing Twilio account identifier");
  // An incoming text is addressed To our number; a delivery report comes From it. Matching the
  // number as well as the account means a shared Twilio account can never cross workspaces.
  const inbound = !input.params.MessageStatus && input.params.SmsStatus === "received";
  const ourNumber = inbound ? input.params.To : input.params.From;
  const candidates = await db
    .select()
    .from(channelAccounts)
    .where(
      and(
        eq(channelAccounts.provider, "twilio"),
        eq(channelAccounts.externalAccountId, accountSid),
        eq(channelAccounts.status, "active"),
      ),
    )
    .limit(50);
  const account = candidates.find(
    (candidate) => ourNumber && senderNumberOf(candidate.capabilities) === ourNumber,
  );
  if (!account?.secretReference) throw new Error("Twilio account not configured");
  const credentials = resolveTwilioCredentials(account.secretReference);
  if (!credentials) throw new Error("Twilio credentials unavailable");
  const verified = validateRequest(credentials.authToken, input.signature, input.url, input.params);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(Object.entries(input.params).sort(([a], [b]) => a.localeCompare(b))))
    .digest("hex");
  const externalEventId = input.params.EventSid || null;

  const [event] = await db
    .insert(providerWebhookEvents)
    .values({
      tenantId: account.tenantId,
      channelAccountId: account.id,
      provider: "twilio",
      externalEventId,
      payloadHash,
      signatureVerified: verified,
      processingStatus: verified ? "received" : "rejected",
      payload: input.params,
    })
    .onConflictDoNothing()
    .returning({ id: providerWebhookEvents.id });
  if (!event) return { duplicate: true };
  if (!verified) throw new Error("Invalid Twilio signature");

  const messageSid = input.params.MessageSid || input.params.SmsSid;
  const messageStatus = input.params.MessageStatus || input.params.SmsStatus;
  if (messageSid && messageStatus) {
    const terminalState = twilioOperationState(messageStatus);
    const [operation] = await db
      .update(automationActionOperations)
      .set({
        ...(terminalState && { state: terminalState }),
        responseMetadata: { provider: "twilio", status: messageStatus },
        ...(terminalState === "failed" && {
          errorMetadata: { provider: "twilio", status: messageStatus },
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(automationActionOperations.tenantId, account.tenantId),
          eq(automationActionOperations.providerReference, messageSid),
        ),
      )
      .returning({ runId: automationActionOperations.runId });
    if (terminalState === "failed" && operation) {
      const [run] = await db
        .update(automationNodeRuns)
        .set({
          status: "failed",
          errorData: { provider: "twilio", status: messageStatus },
          settledAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(automationNodeRuns.id, operation.runId),
            eq(automationNodeRuns.tenantId, account.tenantId),
          ),
        )
        .returning({ enrollmentId: automationNodeRuns.enrollmentId });
      if (run) {
        await db
          .update(automationEnrollments)
          .set({ status: "failed", updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(automationEnrollments.id, run.enrollmentId),
              eq(automationEnrollments.tenantId, account.tenantId),
            ),
          );
      }
    }
  }

  // Delivery reports for messages sent from the inbox.
  if (!inbound && messageSid && messageStatus) {
    const status = twilioInboxStatus(messageStatus);
    if (status) {
      const errorCode = input.params.ErrorCode;
      await updateMessageStatus(
        db,
        account.tenantId,
        account.id,
        messageSid,
        status,
        status === "failed" ? `Twilio error ${errorCode || "unknown"}` : null,
      );
    }
  }

  const from = input.params.From;
  // Incoming text: file it under the sender's conversation, creating the contact if new.
  if (inbound && from && E164.test(from)) {
    const contact = await findOrCreateContactByPhone(db, account.tenantId, from, {
      provenance: "inbound_sms",
      verified: true,
    });
    const threadId = await findOrCreateOpenThread(db, account.tenantId, contact.contactId, "sms");
    const mediaCount = Number(input.params.NumMedia ?? "0") || 0;
    await appendMessage(db, {
      tenantId: account.tenantId,
      threadId,
      contactId: contact.contactId,
      channelAccountId: account.id,
      direction: "inbound",
      status: "received",
      body: (input.params.Body ?? "").slice(0, 5000) || null,
      occurredAt: new Date().toISOString(),
      channelData: { messageSid: messageSid ?? null, mediaCount },
    });
  }

  const command = input.params.Body?.trim().toUpperCase().replace(/\s+/g, " ");
  const optOut = command !== undefined && OPT_OUT_KEYWORDS.has(command);
  const optIn = command !== undefined && OPT_IN_KEYWORDS.has(command);
  if (inbound && from && (optOut || optIn)) {
    const identities = await db
      .select({ id: contactIdentities.id, metadata: contactIdentities.metadata })
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, account.tenantId),
          eq(contactIdentities.type, "phone"),
          eq(contactIdentities.normalizedValue, from),
        ),
      );
    for (const identity of identities) {
      const metadata =
        identity.metadata &&
        typeof identity.metadata === "object" &&
        !Array.isArray(identity.metadata)
          ? (identity.metadata as Record<string, unknown>)
          : {};
      await db
        .update(contactIdentities)
        .set({
          metadata: {
            ...metadata,
            smsConsent: optIn,
            dnd: optOut,
            consentSource: `Contact texted ${command}`,
            consentUpdatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(contactIdentities.id, identity.id),
            eq(contactIdentities.tenantId, account.tenantId),
          ),
        );
    }
  }

  await db
    .update(providerWebhookEvents)
    .set({ processingStatus: "processed", processedAt: new Date().toISOString() })
    .where(
      and(
        eq(providerWebhookEvents.id, event.id),
        eq(providerWebhookEvents.tenantId, account.tenantId),
      ),
    );
  return { duplicate: false };
}
