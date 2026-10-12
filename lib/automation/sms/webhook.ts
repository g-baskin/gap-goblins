import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { validateRequest } from "twilio";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  automationActionOperations,
  automationEnrollments,
  automationNodeRuns,
  channelAccounts,
  contactIdentities,
  providerWebhookEvents,
} from "@/lib/db/schema";

const credentialsSchema = z.object({ authToken: z.string().min(1) }).passthrough();

export function twilioOperationState(status: string): "succeeded" | "failed" | null {
  const normalized = status.toLowerCase();
  if (["delivered", "read"].includes(normalized)) return "succeeded";
  if (["failed", "undelivered"].includes(normalized)) return "failed";
  return null;
}

function secretValue(reference: string): string | null {
  const match = /^env:([A-Z][A-Z0-9_]*)$/.exec(reference);
  return match ? (process.env[match[1] as string] ?? null) : null;
}

export async function processTwilioWebhook(input: {
  signature: string;
  url: string;
  params: Record<string, string>;
}) {
  const accountSid = input.params.AccountSid;
  if (!accountSid) throw new Error("Missing Twilio account identifier");
  const [account] = await db
    .select()
    .from(channelAccounts)
    .where(
      and(
        eq(channelAccounts.provider, "twilio"),
        eq(channelAccounts.externalAccountId, accountSid),
        eq(channelAccounts.status, "active"),
      ),
    )
    .limit(1);
  if (!account?.secretReference) throw new Error("Twilio account not configured");
  const rawSecret = secretValue(account.secretReference);
  if (!rawSecret) throw new Error("Twilio credentials unavailable");
  const { authToken } = credentialsSchema.parse(JSON.parse(rawSecret));
  const verified = validateRequest(authToken, input.signature, input.url, input.params);
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

  const command = input.params.Body?.trim().toUpperCase();
  const from = input.params.From;
  if (from && (command === "STOP" || command === "START")) {
    const [identity] = await db
      .select({ id: contactIdentities.id, metadata: contactIdentities.metadata })
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, account.tenantId),
          eq(contactIdentities.type, "phone"),
          eq(contactIdentities.normalizedValue, from),
        ),
      )
      .limit(1);
    if (identity) {
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
            smsConsent: command === "START",
            dnd: command === "STOP",
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
