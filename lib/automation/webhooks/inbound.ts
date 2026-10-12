import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  automationDispatchOutbox,
  automationEnrollments,
  automationFlows,
  automationWebhookEndpoints,
  automationWebhookEvents,
  automationWorkflowNodes,
  contacts,
} from "@/lib/db/schema";

const payloadSchema = z
  .object({
    contactId: z.uuid(),
    email: z.email(),
    eventId: z.string().trim().min(1).max(200).optional(),
    data: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
const signedInboundWebhookConfigSchema = z.object({
  triggerType: z.literal("signed_inbound_webhook"),
});

export class InboundWebhookError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409 | 413 | 415,
    message: string,
  ) {
    super(message);
    this.name = "InboundWebhookError";
  }
}

function masterSecret(): string {
  const value = process.env.AUTOMATION_WEBHOOK_SECRET;
  if (!value || value.length < 32) throw new Error("AUTOMATION_WEBHOOK_SECRET is not configured");
  return value;
}

function signingSecret(hookId: string): string {
  return createHmac("sha256", masterSecret())
    .update(`automation-hook:v1:${hookId}`)
    .digest("base64url");
}

export function createInboundWebhookCredentials() {
  const hookId = randomBytes(24).toString("base64url");
  const secret = signingSecret(hookId);
  return {
    hookId,
    secret,
    secretReference: `derived:v1:${hookId}`,
    signingSecretHash: createHash("sha256").update(secret).digest("hex"),
  };
}

export function signInboundWebhook(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  const supplied = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = signInboundWebhook(secret, timestamp, body);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

export async function receiveInboundWebhook(input: {
  hookId: string;
  contentType: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: Date;
}) {
  if (!input.contentType?.toLowerCase().startsWith("application/json")) {
    throw new InboundWebhookError(415, "JSON content type required");
  }
  if (Buffer.byteLength(input.body) > 256 * 1024) {
    throw new InboundWebhookError(413, "Webhook body too large");
  }
  const [endpoint] = await db
    .select()
    .from(automationWebhookEndpoints)
    .where(
      and(
        eq(automationWebhookEndpoints.publicHookId, input.hookId),
        eq(automationWebhookEndpoints.status, "active"),
      ),
    )
    .limit(1);
  if (!endpoint) throw new InboundWebhookError(404, "Webhook endpoint not found");

  const now = input.now ?? new Date();
  const timestampMs = input.timestamp ? Number(input.timestamp) * 1000 : Number.NaN;
  const fresh = Number.isFinite(timestampMs) && Math.abs(now.getTime() - timestampMs) <= 5 * 60_000;
  const verified = Boolean(
    fresh &&
      input.timestamp &&
      input.signature &&
      verifySignature(
        signingSecret(endpoint.publicHookId),
        input.timestamp,
        input.body,
        input.signature,
      ),
  );
  let payload: z.infer<typeof payloadSchema> | null = null;
  try {
    payload = payloadSchema.parse(JSON.parse(input.body));
  } catch {
    throw new InboundWebhookError(400, "Invalid webhook payload");
  }
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  const externalEventId = payload.eventId ?? null;
  const [event] = await db
    .insert(automationWebhookEvents)
    .values({
      tenantId: endpoint.tenantId,
      endpointId: endpoint.id,
      externalEventId,
      bodyHash,
      eventTimestamp: new Date(timestampMs || now.getTime()).toISOString(),
      payload,
      signatureStatus: verified ? "valid" : "invalid",
      processingStatus: verified ? "received" : "rejected",
    })
    .onConflictDoNothing()
    .returning({ id: automationWebhookEvents.id });
  if (!event) throw new InboundWebhookError(409, "Webhook event already received");
  if (!verified) throw new InboundWebhookError(401, "Webhook signature rejected");

  return db.transaction(async (tx) => {
    const [flow] = await tx
      .select({ publishedRevisionId: automationFlows.publishedRevisionId })
      .from(automationFlows)
      .where(
        and(
          eq(automationFlows.id, endpoint.flowId),
          eq(automationFlows.tenantId, endpoint.tenantId),
          eq(automationFlows.status, "active"),
          eq(automationFlows.executionMode, "graph"),
        ),
      )
      .limit(1);
    if (!flow?.publishedRevisionId) throw new InboundWebhookError(404, "Webhook target not found");
    const [[contact], [trigger]] = await Promise.all([
      tx
        .select({ id: contacts.id, email: contacts.email })
        .from(contacts)
        .where(and(eq(contacts.id, payload.contactId), eq(contacts.tenantId, endpoint.tenantId)))
        .limit(1),
      tx
        .select({
          nodeKey: automationWorkflowNodes.nodeKey,
          revisionId: automationWorkflowNodes.revisionId,
          config: automationWorkflowNodes.config,
        })
        .from(automationWorkflowNodes)
        .where(
          and(
            eq(automationWorkflowNodes.nodeKey, endpoint.nodeKey),
            eq(automationWorkflowNodes.revisionId, flow.publishedRevisionId),
            eq(automationWorkflowNodes.tenantId, endpoint.tenantId),
            eq(automationWorkflowNodes.nodeType, "trigger"),
          ),
        )
        .limit(1),
    ]);
    if (
      !contact ||
      !trigger ||
      !signedInboundWebhookConfigSchema.safeParse(trigger.config).success ||
      contact.email.toLowerCase() !== payload.email.toLowerCase()
    ) {
      await tx
        .update(automationWebhookEvents)
        .set({ processingStatus: "rejected", processedAt: now.toISOString() })
        .where(eq(automationWebhookEvents.id, event.id));
      throw new InboundWebhookError(404, "Webhook target not found");
    }
    const [enrollment] = await tx
      .insert(automationEnrollments)
      .values({
        tenantId: endpoint.tenantId,
        flowId: endpoint.flowId,
        revisionId: trigger.revisionId,
        contactId: contact.id,
        email: contact.email,
        status: "active",
        metadata: { webhookEventId: event.id, ...payload.data },
      })
      .onConflictDoNothing()
      .returning({ id: automationEnrollments.id });
    if (!enrollment) {
      await tx
        .update(automationWebhookEvents)
        .set({ processingStatus: "duplicate_enrollment", processedAt: now.toISOString() })
        .where(eq(automationWebhookEvents.id, event.id));
      throw new InboundWebhookError(409, "Contact is already enrolled");
    }
    await tx.insert(automationDispatchOutbox).values({
      tenantId: endpoint.tenantId,
      enrollmentId: enrollment.id,
      revisionId: trigger.revisionId,
      successorNodeKey: trigger.nodeKey,
      operationKey: `${enrollment.id}:${trigger.nodeKey}:1`,
      dedupKey: `webhook:${event.id}`,
    });
    await tx
      .update(automationWebhookEvents)
      .set({ processingStatus: "queued", processedAt: now.toISOString() })
      .where(eq(automationWebhookEvents.id, event.id));
    return { eventId: event.id, enrollmentId: enrollment.id };
  });
}
