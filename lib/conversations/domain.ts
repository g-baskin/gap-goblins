export const conversationChannels = ["web_chat", "sms", "email", "voice"] as const;
export type ConversationChannel = (typeof conversationChannels)[number];

export const communicationDirections = ["inbound", "outbound"] as const;
export type CommunicationDirection = (typeof communicationDirections)[number];

export const communicationStatuses = [
  "queued",
  "sent",
  "delivered",
  "read",
  "received",
  "failed",
  "ringing",
  "in_progress",
  "completed",
  "busy",
  "no_answer",
  "canceled",
] as const;
export type CommunicationStatus = (typeof communicationStatuses)[number];

export const communicationEventKinds = [
  "message",
  "message_status",
  "call_started",
  "call_ringing",
  "call_answered",
  "call_completed",
  "call_failed",
] as const;
export type CommunicationEventKind = (typeof communicationEventKinds)[number];

export interface TenantContext {
  tenantId: string;
}

export interface ProviderAccountContext extends TenantContext {
  provider: string;
  providerAccountId: string;
}

export interface ProviderEventReference {
  provider: string;
  providerAccountId: string;
  externalEventId?: string | null;
  payloadHash?: string | null;
}

export interface CanonicalCommunicationEvent {
  id: string;
  tenantId: string;
  providerAccountId: string;
  threadId: string;
  contactId: string;
  channel: ConversationChannel;
  kind: CommunicationEventKind;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  bodyText: string | null;
  occurredAt: Date;
  receivedAt: Date;
  providerSequence: string | null;
  externalEventId: string | null;
  channelData: Readonly<Record<string, unknown>>;
}

export interface NormalizedProviderEvent
  extends Omit<CanonicalCommunicationEvent, "id" | "tenantId" | "threadId" | "contactId"> {
  provider: string;
  externalThreadId: string;
  externalContactId?: string | null;
  payloadHash?: string | null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export function requireUuid(value: string, label: string): string {
  const normalized = requireNonEmpty(value, label);
  if (!uuidPattern.test(normalized)) throw new Error(`A valid ${label.toLowerCase()} is required`);
  return normalized;
}

export function requireTenantContext(context: TenantContext): string {
  const tenantId = context?.tenantId?.trim();
  if (!tenantId || !uuidPattern.test(tenantId)) {
    throw new Error("A valid tenant context is required");
  }
  return tenantId;
}

export function requireProviderAccountContext(context: ProviderAccountContext): {
  tenantId: string;
  provider: string;
  providerAccountId: string;
} {
  return {
    tenantId: requireTenantContext(context),
    provider: requireNonEmpty(context?.provider ?? "", "Provider").toLowerCase(),
    providerAccountId: requireUuid(context?.providerAccountId ?? "", "Provider account"),
  };
}

export function normalizeIdentity(type: string, value: string): string {
  const normalizedType = type.trim().toLowerCase();
  const normalizedValue = value.trim();

  if (normalizedType === "email") {
    const email = normalizedValue.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email identity");
    return email;
  }

  if (normalizedType === "phone") {
    const phone = normalizedValue.replace(/[\s().-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Phone identity must be E.164");
    return phone;
  }

  if (!normalizedValue) throw new Error("Identity value is required");
  return normalizedValue;
}

export function contactIdentityUniquenessKey(
  context: TenantContext,
  type: string,
  value: string,
): string {
  return `${requireTenantContext(context)}:${type.trim().toLowerCase()}:${normalizeIdentity(type, value)}`;
}

export function providerWebhookIdempotencyKey(reference: ProviderEventReference): string {
  const provider = reference.provider.trim().toLowerCase();
  const account = reference.providerAccountId.trim();
  const event = reference.externalEventId?.trim() || reference.payloadHash?.trim();
  if (!provider || !uuidPattern.test(account) || !event) {
    throw new Error(
      "Provider, provider account, and external event ID or payload hash are required",
    );
  }
  return `${provider}:${account}:${event}`;
}

export function outboundOperationIdempotencyKey(
  context: TenantContext,
  providerAccountId: string,
  idempotencyKey: string,
): string {
  const account = requireUuid(providerAccountId, "Provider account");
  const key = requireNonEmpty(idempotencyKey, "Idempotency key");
  return `${requireTenantContext(context)}:${account}:${key}`;
}
