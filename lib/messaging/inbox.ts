/**
 * The conversations inbox: contacts, threads and messages, all scoped to one tenant.
 * Every function takes the tenant id and filters on it, so an id from another tenant
 * always reads as "not found". Callers pass the database handle (web `db`, worker, or a
 * test client), like the Lead Finder services.
 */
import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { CommunicationStatus } from "@/lib/conversations/domain";
import {
  communicationEvents,
  contactIdentities,
  conversationThreads,
  omnichannelContacts,
  outboundOperations,
} from "@/lib/db/schema";
import type { LeadFinderExecutor } from "@/lib/lead-finder/db";
import { toUsE164 } from "@/lib/lead-finder/phone";

export type InboxFilter = "all" | "unread" | "recent" | "starred";

export interface SmsConsentState {
  consent: boolean;
  optedOut: boolean;
  timezone: string | null;
  source: string | null;
  recordedAt: string | null;
}

export interface InboxThreadSummary {
  id: string;
  contactId: string;
  contactName: string;
  phone: string | null;
  channel: string;
  unreadCount: number;
  starred: boolean;
  preview: string | null;
  lastEventAt: string | null;
}

export interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  body: string | null;
  occurredAt: string;
  error: string | null;
}

export interface InboxThreadDetail extends InboxThreadSummary {
  consent: SmsConsentState;
  messages: InboxMessage[];
}

const PREVIEW_LENGTH = 160;
const MESSAGE_LIMIT = 300;
const RECENT_DAYS = 7;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function consentState(metadata: unknown): SmsConsentState {
  const data = record(metadata);
  return {
    consent: data.smsConsent === true && data.dnd !== true,
    optedOut: data.dnd === true,
    timezone: typeof data.timezone === "string" ? data.timezone : null,
    source: typeof data.consentSource === "string" ? data.consentSource : null,
    recordedAt: typeof data.consentUpdatedAt === "string" ? data.consentUpdatedAt : null,
  };
}

/** A US phone number in E.164 form ("+15405550123"), or null. */
export function normalizeSmsPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed.startsWith("+1") ? toUsE164(trimmed) : null;
  return toUsE164(trimmed);
}

function preview(body: string | null): string | null {
  if (!body) return null;
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat;
}

/**
 * Finds the contact that owns a phone number, or creates one. A verified identity wins over
 * an unverified one. `verified` marks the number as proven to belong to the contact (they
 * texted from it, or the team recorded consent for it).
 */
export async function findOrCreateContactByPhone(
  db: LeadFinderExecutor,
  tenantId: string,
  phone: string,
  options: { displayName?: string | null; provenance: string; verified: boolean },
): Promise<{ contactId: string; identityId: string; created: boolean }> {
  const existing = await db
    .select({
      id: contactIdentities.id,
      contactId: contactIdentities.contactId,
      verificationStatus: contactIdentities.verificationStatus,
    })
    .from(contactIdentities)
    .where(
      and(
        eq(contactIdentities.tenantId, tenantId),
        eq(contactIdentities.type, "phone"),
        eq(contactIdentities.normalizedValue, phone),
      ),
    )
    .orderBy(sql`case when ${contactIdentities.verificationStatus} = 'verified' then 0 else 1 end`)
    .limit(1);
  const found = existing[0];
  if (found) {
    if (options.verified && found.verificationStatus !== "verified") {
      await db
        .update(contactIdentities)
        .set({ verificationStatus: "verified", updatedAt: new Date().toISOString() })
        .where(and(eq(contactIdentities.tenantId, tenantId), eq(contactIdentities.id, found.id)));
    }
    return { contactId: found.contactId, identityId: found.id, created: false };
  }

  const [contact] = await db
    .insert(omnichannelContacts)
    .values({ tenantId, displayName: options.displayName?.trim() || null })
    .returning({ id: omnichannelContacts.id });
  if (!contact) throw new Error("Could not create contact");
  const [identity] = await db
    .insert(contactIdentities)
    .values({
      tenantId,
      contactId: contact.id,
      type: "phone",
      value: phone,
      normalizedValue: phone,
      verificationStatus: options.verified ? "verified" : "unverified",
      provenance: options.provenance,
    })
    .returning({ id: contactIdentities.id });
  if (!identity) throw new Error("Could not create contact phone");
  return { contactId: contact.id, identityId: identity.id, created: true };
}

/** The contact's open SMS thread, created when there is none. Safe when two calls race. */
export async function findOrCreateOpenThread(
  db: LeadFinderExecutor,
  tenantId: string,
  contactId: string,
  channel: "sms",
): Promise<string> {
  const select = () =>
    db
      .select({ id: conversationThreads.id })
      .from(conversationThreads)
      .where(
        and(
          eq(conversationThreads.tenantId, tenantId),
          eq(conversationThreads.contactId, contactId),
          eq(conversationThreads.channel, channel),
          eq(conversationThreads.state, "open"),
        ),
      )
      .limit(1);
  const [existing] = await select();
  if (existing) return existing.id;
  await db
    .insert(conversationThreads)
    .values({ tenantId, contactId, channel, state: "open" })
    .onConflictDoNothing();
  const [created] = await select();
  if (!created) throw new Error("Could not create conversation");
  return created.id;
}

/** Adds a message to a thread and updates the thread's preview, time and unread count. */
export async function appendMessage(
  db: LeadFinderExecutor,
  input: {
    tenantId: string;
    threadId: string;
    contactId: string;
    channelAccountId: string;
    direction: "inbound" | "outbound";
    status: CommunicationStatus;
    body: string | null;
    occurredAt: string;
    actorId?: string | null;
    channelData?: Record<string, unknown>;
  },
): Promise<string> {
  const [event] = await db
    .insert(communicationEvents)
    .values({
      tenantId: input.tenantId,
      threadId: input.threadId,
      contactId: input.contactId,
      sourceChannelAccountId: input.channelAccountId,
      channel: "sms",
      kind: "message",
      direction: input.direction,
      actorType: input.direction === "outbound" ? "user" : "contact",
      actorId: input.actorId ?? null,
      bodyText: input.body,
      status: input.status,
      channelData: input.channelData ?? {},
      occurredAt: input.occurredAt,
    })
    .returning({ id: communicationEvents.id });
  if (!event) throw new Error("Could not save message");
  await db
    .update(conversationThreads)
    .set({
      lastEventAt: sql`greatest(coalesce(${conversationThreads.lastEventAt}, ${input.occurredAt}), ${input.occurredAt})`,
      lastMessagePreview: preview(input.body),
      unreadCount:
        input.direction === "inbound"
          ? sql`${conversationThreads.unreadCount} + 1`
          : conversationThreads.unreadCount,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(conversationThreads.tenantId, input.tenantId),
        eq(conversationThreads.id, input.threadId),
      ),
    );
  return event.id;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function listThreads(
  db: LeadFinderExecutor,
  tenantId: string,
  options: { filter?: InboxFilter; query?: string; limit?: number; now?: Date } = {},
): Promise<InboxThreadSummary[]> {
  const filter = options.filter ?? "all";
  const conditions = [
    eq(conversationThreads.tenantId, tenantId),
    eq(conversationThreads.state, "open"),
  ];
  if (filter === "unread") conditions.push(gt(conversationThreads.unreadCount, 0));
  if (filter === "starred") conditions.push(eq(conversationThreads.starred, true));
  if (filter === "recent") {
    const since = new Date((options.now ?? new Date()).getTime() - RECENT_DAYS * 86_400_000);
    conditions.push(gt(conversationThreads.lastEventAt, since.toISOString()));
  }
  const query = options.query?.trim().slice(0, 100);
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    const digits = query.replace(/\D/g, "");
    const match = or(
      ilike(omnichannelContacts.displayName, pattern),
      ilike(conversationThreads.lastMessagePreview, pattern),
      ilike(contactIdentities.normalizedValue, digits.length >= 3 ? `%${digits}%` : pattern),
    );
    if (match) conditions.push(match);
  }
  const rows = await db
    .select({
      id: conversationThreads.id,
      contactId: conversationThreads.contactId,
      contactName: omnichannelContacts.displayName,
      phone: contactIdentities.normalizedValue,
      channel: conversationThreads.channel,
      unreadCount: conversationThreads.unreadCount,
      starred: conversationThreads.starred,
      preview: conversationThreads.lastMessagePreview,
      lastEventAt: conversationThreads.lastEventAt,
    })
    .from(conversationThreads)
    .innerJoin(
      omnichannelContacts,
      and(
        eq(omnichannelContacts.tenantId, conversationThreads.tenantId),
        eq(omnichannelContacts.id, conversationThreads.contactId),
      ),
    )
    .leftJoin(
      contactIdentities,
      and(
        eq(contactIdentities.tenantId, conversationThreads.tenantId),
        eq(contactIdentities.contactId, conversationThreads.contactId),
        eq(contactIdentities.type, "phone"),
      ),
    )
    .where(and(...conditions))
    .orderBy(
      desc(sql`coalesce(${conversationThreads.lastEventAt}, ${conversationThreads.createdAt})`),
    )
    .limit(Math.min(options.limit ?? 100, 200));
  // A contact can hold more than one phone; keep one row per thread.
  const seen = new Set<string>();
  return rows
    .filter((row) => !seen.has(row.id) && seen.add(row.id))
    .map((row) => ({
      ...row,
      contactName: row.contactName ?? row.phone ?? "Unknown contact",
    }));
}

async function threadSummary(
  db: LeadFinderExecutor,
  tenantId: string,
  threadId: string,
): Promise<(InboxThreadSummary & { identityMetadata: unknown }) | null> {
  const [row] = await db
    .select({
      id: conversationThreads.id,
      contactId: conversationThreads.contactId,
      contactName: omnichannelContacts.displayName,
      channel: conversationThreads.channel,
      unreadCount: conversationThreads.unreadCount,
      starred: conversationThreads.starred,
      preview: conversationThreads.lastMessagePreview,
      lastEventAt: conversationThreads.lastEventAt,
    })
    .from(conversationThreads)
    .innerJoin(
      omnichannelContacts,
      and(
        eq(omnichannelContacts.tenantId, conversationThreads.tenantId),
        eq(omnichannelContacts.id, conversationThreads.contactId),
      ),
    )
    .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
    .limit(1);
  if (!row) return null;
  const [identity] = await db
    .select({ phone: contactIdentities.normalizedValue, metadata: contactIdentities.metadata })
    .from(contactIdentities)
    .where(
      and(
        eq(contactIdentities.tenantId, tenantId),
        eq(contactIdentities.contactId, row.contactId),
        eq(contactIdentities.type, "phone"),
      ),
    )
    .orderBy(sql`case when ${contactIdentities.verificationStatus} = 'verified' then 0 else 1 end`)
    .limit(1);
  return {
    ...row,
    contactName: row.contactName ?? identity?.phone ?? "Unknown contact",
    phone: identity?.phone ?? null,
    identityMetadata: identity?.metadata ?? {},
  };
}

export async function getThread(
  db: LeadFinderExecutor,
  tenantId: string,
  threadId: string,
): Promise<InboxThreadDetail | null> {
  const summary = await threadSummary(db, tenantId, threadId);
  if (!summary) return null;
  const events = await db
    .select({
      id: communicationEvents.id,
      direction: communicationEvents.direction,
      status: communicationEvents.status,
      body: communicationEvents.bodyText,
      occurredAt: communicationEvents.occurredAt,
      channelData: communicationEvents.channelData,
    })
    .from(communicationEvents)
    .where(
      and(
        eq(communicationEvents.tenantId, tenantId),
        eq(communicationEvents.threadId, threadId),
        eq(communicationEvents.kind, "message"),
      ),
    )
    .orderBy(desc(communicationEvents.occurredAt), desc(communicationEvents.id))
    .limit(MESSAGE_LIMIT);
  const { identityMetadata, ...rest } = summary;
  return {
    ...rest,
    consent: consentState(identityMetadata),
    messages: events.reverse().map((event) => {
      const error = record(event.channelData).error;
      return {
        id: event.id,
        direction: event.direction === "outbound" ? "outbound" : "inbound",
        status: event.status,
        body: event.body,
        occurredAt: event.occurredAt,
        error: typeof error === "string" ? error : null,
      };
    }),
  };
}

export async function updateThread(
  db: LeadFinderExecutor,
  tenantId: string,
  threadId: string,
  changes: { starred?: boolean; read?: boolean },
): Promise<boolean> {
  const rows = await db
    .update(conversationThreads)
    .set({
      ...(changes.starred !== undefined ? { starred: changes.starred } : {}),
      ...(changes.read ? { unreadCount: 0 } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
    .returning({ id: conversationThreads.id });
  return rows.length > 0;
}

/**
 * Records that the contact agreed to receive texts (or withdraws it). The team states how the
 * consent was given, and the contact's timezone, so quiet hours can be enforced. Recording
 * consent also marks the number as belonging to the contact. `recordedBy` is null when the
 * system records it (for example a STOP reply) rather than a person.
 */
export async function setSmsConsent(
  db: LeadFinderExecutor,
  tenantId: string,
  contactId: string,
  input:
    | { consent: true; source: string; timezone: string; recordedBy: string | null }
    | { consent: false; recordedBy: string | null },
): Promise<boolean> {
  const identities = await db
    .select({ id: contactIdentities.id, metadata: contactIdentities.metadata })
    .from(contactIdentities)
    .where(
      and(
        eq(contactIdentities.tenantId, tenantId),
        eq(contactIdentities.contactId, contactId),
        eq(contactIdentities.type, "phone"),
      ),
    );
  if (identities.length === 0) return false;
  const now = new Date().toISOString();
  for (const identity of identities) {
    const metadata = record(identity.metadata);
    await db
      .update(contactIdentities)
      .set({
        ...(input.consent ? { verificationStatus: "verified" } : {}),
        metadata: input.consent
          ? {
              ...metadata,
              smsConsent: true,
              dnd: false,
              timezone: input.timezone,
              consentSource: input.source,
              consentRecordedBy: input.recordedBy,
              consentUpdatedAt: now,
            }
          : {
              ...metadata,
              smsConsent: false,
              dnd: true,
              consentSource: "Opted out by team member",
              consentRecordedBy: input.recordedBy,
              consentUpdatedAt: now,
            },
        updatedAt: now,
      })
      .where(and(eq(contactIdentities.tenantId, tenantId), eq(contactIdentities.id, identity.id)));
  }
  return true;
}

/** Updates the status of an inbox message from a Twilio delivery report. */
export async function updateMessageStatus(
  db: LeadFinderExecutor,
  tenantId: string,
  channelAccountId: string,
  messageSid: string,
  status: CommunicationStatus,
  error: string | null,
): Promise<boolean> {
  const [operation] = await db
    .select({ id: outboundOperations.id, eventId: outboundOperations.eventId })
    .from(outboundOperations)
    .where(
      and(
        eq(outboundOperations.tenantId, tenantId),
        eq(outboundOperations.channelAccountId, channelAccountId),
        eq(outboundOperations.externalReference, messageSid),
      ),
    )
    .limit(1);
  if (!operation?.eventId) return false;
  const [event] = await db
    .select({ status: communicationEvents.status, channelData: communicationEvents.channelData })
    .from(communicationEvents)
    .where(
      and(
        eq(communicationEvents.tenantId, tenantId),
        eq(communicationEvents.id, operation.eventId),
      ),
    )
    .limit(1);
  if (!event) return false;
  // Delivery reports can arrive out of order; never move a delivered message back to "sent".
  const rank: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
  if ((rank[event.status] ?? 0) > (rank[status] ?? 0)) return true;
  await db
    .update(communicationEvents)
    .set({
      status,
      channelData: { ...record(event.channelData), ...(error ? { error } : {}) },
    })
    .where(
      and(
        eq(communicationEvents.tenantId, tenantId),
        eq(communicationEvents.id, operation.eventId),
      ),
    );
  await db
    .update(outboundOperations)
    .set({
      status: status === "failed" ? "failed" : "succeeded",
      ...(error ? { terminalError: error } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(outboundOperations.tenantId, tenantId), eq(outboundOperations.id, operation.id)));
  return true;
}
