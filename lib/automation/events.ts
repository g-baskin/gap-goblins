import { eq, sql } from "drizzle-orm";
import {
  automationEnrollments,
  automationEvents,
  automationFlows,
  automationSends,
  contacts,
  contactTimeline,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { markEnrollmentConverted, stopEnrollment } from "./enrollments";
import type { AutomationEventType, AutomationWebhookEvent, ConversionRule } from "./types";

const EVENT_TYPE_MAP: Record<string, AutomationEventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
};

export async function handleAutomationResendEvent(
  event: AutomationWebhookEvent,
  svixId: string | null,
): Promise<boolean> {
  const tags = event.data.tags ?? {};
  const sendId = tags.automation_send_id;
  const providerMessageId = event.data.email_id;

  if (!sendId && !providerMessageId) {
    return true;
  }

  const send = sendId
    ? await getSendById(sendId)
    : providerMessageId
      ? await getSendByProviderMessageId(providerMessageId)
      : null;

  if (!send) {
    return true;
  }

  const eventType = EVENT_TYPE_MAP[event.type] ?? "sent";
  const data = extractWebhookEventData(event);

  await db.insert(automationEvents).values({
    flowId: send.flowId,
    stepId: send.stepId,
    enrollmentId: send.enrollmentId,
    sendId: send.id,
    subscriberId: send.subscriberId,
    contactId: send.contactId,
    eventType,
    providerMessageId,
    svixId,
    linkUrl: data.linkUrl,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    eventData: event.data,
    createdAt: event.created_at,
  });

  await updateAutomationSendFromEvent(eventType, send.id, {
    providerMessageId,
    linkUrl: data.linkUrl,
    errorMessage: data.errorMessage,
  });
  await updateAutomationEnrollmentFromEvent(eventType, send.enrollmentId, {
    linkUrl: data.linkUrl,
    eventCreatedAt: event.created_at,
  });

  return true;
}

export async function updateAutomationSendFromEvent(
  eventType: AutomationEventType,
  sendId: string,
  data: {
    providerMessageId?: string | null;
    linkUrl?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<typeof automationSends.$inferInsert> = {
    updatedAt: now,
    ...(data.providerMessageId ? { providerMessageId: data.providerMessageId } : {}),
  };

  switch (eventType) {
    case "sent":
      updates.status = "sent";
      updates.sentAt = now;
      break;
    case "delivered":
      updates.status = "delivered";
      updates.deliveredAt = now;
      break;
    case "opened":
      updates.status = "opened";
      updates.openedAt = now;
      break;
    case "clicked":
      updates.status = "clicked";
      updates.firstClickAt = now;
      break;
    case "bounced":
      updates.status = "bounced";
      updates.bouncedAt = now;
      break;
    case "complained":
      updates.status = "complained";
      updates.complainedAt = now;
      break;
    case "failed":
    case "suppressed":
      updates.status = "failed";
      updates.errorMessage = data.errorMessage ?? eventType;
      break;
    default:
      break;
  }

  await db.update(automationSends).set(updates).where(eq(automationSends.id, sendId));
}

export async function updateAutomationEnrollmentFromEvent(
  eventType: AutomationEventType,
  enrollmentId: string,
  data: { linkUrl?: string | null; eventCreatedAt?: string },
): Promise<void> {
  const now = data.eventCreatedAt ?? new Date().toISOString();
  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(eq(automationEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return;
  }

  const updates: Partial<typeof automationEnrollments.$inferInsert> = {
    lastEventAt: now,
    updatedAt: now,
  };

  switch (eventType) {
    case "delivered":
      updates.engagementStage = maxEngagementStage(enrollment.engagementStage, "delivered");
      break;
    case "opened":
      updates.engagementStage = maxEngagementStage(enrollment.engagementStage, "opened");
      updates.openedAt = enrollment.openedAt ?? now;
      updates.engagementScore = (enrollment.engagementScore ?? 0) + 1;
      break;
    case "clicked":
      updates.engagementStage = maxEngagementStage(enrollment.engagementStage, "clicked");
      updates.clickedAt = enrollment.clickedAt ?? now;
      updates.engagementScore = (enrollment.engagementScore ?? 0) + 5;
      break;
    case "bounced":
      await stopEnrollment(enrollmentId, "email_bounced", "bounced");
      return;
    case "complained":
      await stopEnrollment(enrollmentId, "spam_complaint", "complained");
      return;
    case "failed":
    case "suppressed":
      await stopEnrollment(enrollmentId, eventType, "stopped");
      return;
    default:
      break;
  }

  await db
    .update(automationEnrollments)
    .set(updates)
    .where(eq(automationEnrollments.id, enrollmentId));

  if (eventType === "clicked" && data.linkUrl) {
    await applyConversionRules(enrollmentId, data.linkUrl);
  }
}

export async function applyConversionRules(enrollmentId: string, linkUrl: string): Promise<void> {
  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(eq(automationEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return;
  }

  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(eq(automationFlows.id, enrollment.flowId))
    .limit(1);
  const rules = normalizeConversionRules(flow?.conversionRules);
  const matchedRule = rules.find((rule) => doesRuleMatch(rule.pattern, linkUrl));
  const isHighIntent = matchedRule || /booking|calendar|cal\.com|pricing|proposal/i.test(linkUrl);

  if (!isHighIntent) {
    return;
  }

  if (matchedRule?.action === "convert") {
    await markEnrollmentConverted(enrollmentId, `Clicked conversion link: ${linkUrl}`);
    return;
  }

  const now = new Date().toISOString();
  await db
    .update(automationEnrollments)
    .set({
      engagementStage: "hot",
      engagementScore: sql`${automationEnrollments.engagementScore} + 10`,
      lastEventAt: now,
      updatedAt: now,
    })
    .where(eq(automationEnrollments.id, enrollmentId));

  if (enrollment.contactId) {
    await markContactHot(enrollment.contactId, linkUrl, matchedRule?.label);
  }
}

async function getSendById(sendId: string): Promise<typeof automationSends.$inferSelect | null> {
  const [send] = await db
    .select()
    .from(automationSends)
    .where(eq(automationSends.id, sendId))
    .limit(1);
  return send ?? null;
}

async function getSendByProviderMessageId(
  providerMessageId: string,
): Promise<typeof automationSends.$inferSelect | null> {
  const [send] = await db
    .select()
    .from(automationSends)
    .where(eq(automationSends.providerMessageId, providerMessageId))
    .limit(1);
  return send ?? null;
}

function extractWebhookEventData(event: AutomationWebhookEvent): {
  linkUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
} {
  const click =
    typeof event.data.click === "object" && event.data.click !== null ? event.data.click : null;
  const error =
    typeof event.data.error === "object" && event.data.error !== null ? event.data.error : null;
  const bounce =
    typeof event.data.bounce === "object" && event.data.bounce !== null ? event.data.bounce : null;

  return {
    linkUrl: stringFromRecord(click, "link") ?? stringFromRecord(event.data, "link"),
    ipAddress: stringFromRecord(click, "ipAddress") ?? stringFromRecord(event.data, "ip_address"),
    userAgent: stringFromRecord(click, "userAgent") ?? stringFromRecord(event.data, "user_agent"),
    errorMessage:
      stringFromRecord(error, "message") ??
      stringFromRecord(bounce, "message") ??
      stringFromRecord(event.data, "reason"),
  };
}

function stringFromRecord(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : null;
}

function maxEngagementStage(current: string, next: string): string {
  const rank = new Map([
    ["enrolled", 0],
    ["sent", 1],
    ["delivered", 2],
    ["opened", 3],
    ["clicked", 4],
    ["engaged", 5],
    ["hot", 6],
    ["converted", 7],
    ["stopped", 8],
  ]);
  return (rank.get(next) ?? 0) > (rank.get(current) ?? 0) ? next : current;
}

function normalizeConversionRules(value: unknown): ConversionRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((rule) => {
    if (!rule || typeof rule !== "object") {
      return [];
    }
    const record = rule as Record<string, unknown>;
    if (typeof record.pattern !== "string" || record.pattern.length === 0) {
      return [];
    }
    return [
      {
        pattern: record.pattern,
        action: record.action === "convert" ? "convert" : "mark_hot",
        label: typeof record.label === "string" ? record.label : undefined,
      } satisfies ConversionRule,
    ];
  });
}

function doesRuleMatch(pattern: string, linkUrl: string): boolean {
  try {
    return new RegExp(pattern, "i").test(linkUrl);
  } catch {
    return linkUrl.toLowerCase().includes(pattern.toLowerCase());
  }
}

async function markContactHot(contactId: string, linkUrl: string, label?: string): Promise<void> {
  const now = new Date().toISOString();
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  const tags = new Set(contact?.tags ?? []);
  tags.add("automation-hot");
  tags.add("clicked-booking-link");

  await db
    .update(contacts)
    .set({
      tags: Array.from(tags).sort(),
      latestSource: "automation",
      latestSourceDetail: label ?? "high_intent_click",
      lastTouchDate: now,
      updatedAt: now,
    })
    .where(eq(contacts.id, contactId));

  await db.insert(contactTimeline).values({
    contactId,
    eventType: "automation_high_intent_click",
    title: "Clicked high-intent automation link",
    description: linkUrl,
    metadata: { linkUrl, label },
    createdAt: now,
  });
}
