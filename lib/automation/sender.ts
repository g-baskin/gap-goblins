import { and, eq, sql } from "drizzle-orm";
import DOMPurify from "isomorphic-dompurify";
import type { Resend } from "resend";
import { STATUS_RANK } from "@/lib/crm/constants";
import {
  automationEnrollments,
  automationEvents,
  automationFlows,
  automationSends,
  automationSteps,
  contacts,
  contactTimeline,
  newsletterSubscribers,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { advanceEnrollmentToNextStep } from "./enrollments";
import type { AutomationSendStepPayload } from "./types";
import { buildAutomationUnsubscribeToken } from "./unsubscribe";

export interface RenderAutomationEmailResult {
  subject: string;
  html: string;
  text: string;
}

export interface SendAutomationStepResult {
  success: boolean;
  skipped?: boolean;
  sendId?: string;
  providerMessageId?: string;
  error?: string;
}

type AutomationActionSettings = {
  tags?: string[];
  tag?: string;
  status?: string;
};

export async function sendAutomationStep(
  resend: Resend,
  payload: AutomationSendStepPayload,
): Promise<SendAutomationStepResult> {
  const now = new Date().toISOString();

  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(eq(automationEnrollments.id, payload.enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.status !== "active") {
    return { success: true, skipped: true };
  }

  if (
    payload.expectedStepOrder != null &&
    enrollment.currentStepOrder >= payload.expectedStepOrder
  ) {
    return { success: true, skipped: true };
  }

  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(eq(automationFlows.id, payload.flowId))
    .limit(1);

  if (!flow || flow.status !== "active") {
    return { success: true, skipped: true };
  }

  const [step] = await db
    .select()
    .from(automationSteps)
    .where(eq(automationSteps.id, payload.stepId ?? enrollment.currentStepId ?? ""))
    .limit(1);

  if (!step) {
    return { success: false, error: "Automation step not found" };
  }

  if (step.stepType === "wait") {
    await markStepCompleted(enrollment, step, "wait_completed");
    await advanceEnrollmentToNextStep(enrollment.id);
    return { success: true, skipped: true };
  }

  if (step.stepType === "add_tag" || step.stepType === "update_contact_status") {
    await executeAutomationActionStep(enrollment, step);
    await advanceEnrollmentToNextStep(enrollment.id);
    return { success: true, skipped: true };
  }

  const existingSend = await getExistingStepSend(enrollment.id, step.id);
  if (existingSend && ["sent", "delivered", "opened", "clicked"].includes(existingSend.status)) {
    return {
      success: true,
      skipped: true,
      sendId: existingSend.id,
      providerMessageId: existingSend.providerMessageId ?? undefined,
    };
  }

  const rendered = await renderAutomationEmail(step, enrollment, flow);
  const fromEmail = getAutomationFromEmail(flow.fromEmail);
  const fromName = flow.fromName || "__YOUR_BRAND__";
  const replyTo = flow.replyTo || fromEmail;
  const unsubscribeUrl = buildAutomationUnsubscribeUrl(enrollment);

  const send =
    existingSend ??
    (await createAutomationSend({
      flowId: flow.id,
      stepId: step.id,
      enrollmentId: enrollment.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      toEmail: enrollment.email,
      subject: rendered.subject,
      fromEmail,
      fromName,
      replyTo,
      scheduledAt: enrollment.nextStepAt ?? now,
    }));

  try {
    await db
      .update(automationSends)
      .set({ status: "sending", updatedAt: now })
      .where(eq(automationSends.id, send.id));

    const response = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: enrollment.email,
      replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        Precedence: "bulk",
      },
      tags: buildAutomationTags(flow.id, step.id, enrollment, send.id),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const providerMessageId = response.data?.id ?? null;
    const sentAt = new Date().toISOString();
    await db
      .update(automationSends)
      .set({
        status: "sent",
        providerMessageId,
        sentAt,
        updatedAt: sentAt,
      })
      .where(eq(automationSends.id, send.id));

    await db
      .update(automationEnrollments)
      .set({
        currentStepOrder: step.stepOrder,
        currentStepId: step.id,
        engagementStage: "sent",
        lastEventAt: sentAt,
        updatedAt: sentAt,
      })
      .where(eq(automationEnrollments.id, enrollment.id));

    await db.insert(automationEvents).values({
      flowId: flow.id,
      stepId: step.id,
      enrollmentId: enrollment.id,
      sendId: send.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      eventType: "step_sent",
      providerMessageId,
      eventData: { subject: rendered.subject },
      createdAt: sentAt,
    });

    await advanceEnrollmentToNextStep(enrollment.id);

    return {
      success: true,
      sendId: send.id,
      providerMessageId: providerMessageId ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(automationSends)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() })
      .where(eq(automationSends.id, send.id));

    await db.insert(automationEvents).values({
      flowId: flow.id,
      stepId: step.id,
      enrollmentId: enrollment.id,
      sendId: send.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      eventType: "failed",
      eventData: { error: message },
      createdAt: new Date().toISOString(),
    });

    return { success: false, sendId: send.id, error: message };
  }
}

export async function renderAutomationEmail(
  step: typeof automationSteps.$inferSelect,
  enrollment: typeof automationEnrollments.$inferSelect,
  flow: typeof automationFlows.$inferSelect,
): Promise<RenderAutomationEmailResult> {
  const subscriber = enrollment.subscriberId
    ? await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.id, enrollment.subscriberId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;
  const contact = enrollment.contactId
    ? await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, enrollment.contactId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const unsubscribeUrl = buildAutomationUnsubscribeUrl(enrollment);
  const tokens = buildTokens(enrollment, subscriber, contact, unsubscribeUrl);
  const subject = substituteTokens(step.subject || flow.name, tokens);
  const rawHtml = step.bodyHtml || `<p>${escapeHtml(step.bodyText || "")}</p>`;
  const rawText = step.bodyText || stripHtml(rawHtml);

  return {
    subject,
    html: DOMPurify.sanitize(substituteTokens(rawHtml, tokens)),
    text: substituteTokens(rawText, tokens),
  };
}

export function buildAutomationUnsubscribeUrl(
  enrollment: Pick<typeof automationEnrollments.$inferSelect, "id">,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3500";
  const url = new URL(`/api/automation/unsubscribe/${enrollment.id}`, siteUrl);
  url.searchParams.set("token", buildAutomationUnsubscribeToken(enrollment.id));
  return url.href;
}

function buildAutomationTags(
  flowId: string,
  stepId: string,
  enrollment: typeof automationEnrollments.$inferSelect,
  sendId: string,
): Array<{ name: string; value: string }> {
  const tags = [
    { name: "source", value: "automation" },
    { name: "automation_flow_id", value: flowId },
    { name: "automation_step_id", value: stepId },
    { name: "automation_enrollment_id", value: enrollment.id },
    { name: "automation_send_id", value: sendId },
  ];

  if (enrollment.subscriberId) {
    tags.push({ name: "subscriber_id", value: enrollment.subscriberId });
  }
  if (enrollment.contactId) {
    tags.push({ name: "contact_id", value: enrollment.contactId });
  }

  return tags;
}

async function createAutomationSend(input: {
  flowId: string;
  stepId: string;
  enrollmentId: string;
  subscriberId: string | null;
  contactId: string | null;
  toEmail: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  scheduledAt: string;
}): Promise<typeof automationSends.$inferSelect> {
  const now = new Date().toISOString();
  const [send] = await db
    .insert(automationSends)
    .values({
      ...input,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (send) {
    return send;
  }

  const existing = await getExistingStepSend(input.enrollmentId, input.stepId);
  if (!existing) {
    throw new Error("Failed to create automation send");
  }

  return existing;
}

async function getExistingStepSend(
  enrollmentId: string,
  stepId: string,
): Promise<typeof automationSends.$inferSelect | null> {
  const [send] = await db
    .select()
    .from(automationSends)
    .where(and(eq(automationSends.enrollmentId, enrollmentId), eq(automationSends.stepId, stepId)))
    .limit(1);

  return send ?? null;
}

async function executeAutomationActionStep(
  enrollment: typeof automationEnrollments.$inferSelect,
  step: typeof automationSteps.$inferSelect,
): Promise<void> {
  const settings = parseActionSettings(step.settings);

  if (!enrollment.contactId) {
    await markStepCompleted(enrollment, step, "action_skipped", {
      action: step.stepType,
      reason: "missing_contact",
    });
    return;
  }

  if (step.stepType === "add_tag") {
    const tags = normalizeTags(settings.tags ?? settings.tag);
    if (tags.length === 0) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "missing_tags",
      });
      return;
    }

    const [contact] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.id, enrollment.contactId))
      .limit(1);

    if (!contact) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "contact_not_found",
      });
      return;
    }

    const addedTags = tags.filter((tag) => !(contact.tags ?? []).includes(tag));
    if (addedTags.length === 0) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "tags_already_present",
        tags,
      });
      return;
    }

    await db.execute(
      sql`SELECT bulk_add_tags(${[enrollment.contactId]}::uuid[], ${addedTags}::text[])`,
    );
    await writeContactTimelineEvent(
      enrollment.contactId,
      "tags_updated",
      "Tags updated by automation",
      {
        added_tags: addedTags,
        automation_step_id: step.id,
        automation_enrollment_id: enrollment.id,
      },
    );
    await markStepCompleted(enrollment, step, "action_completed", {
      action: step.stepType,
      tags: addedTags,
    });
    return;
  }

  if (step.stepType === "update_contact_status") {
    const status = normalizeStatus(settings.status);
    if (!status) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "missing_status",
      });
      return;
    }

    const [contact] = await db
      .select({ contactStatus: contacts.contactStatus })
      .from(contacts)
      .where(eq(contacts.id, enrollment.contactId))
      .limit(1);

    if (!contact) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "contact_not_found",
      });
      return;
    }

    if (contact.contactStatus === status) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "status_already_set",
        status,
      });
      return;
    }

    const currentRank = contact.contactStatus ? (STATUS_RANK[contact.contactStatus] ?? 0) : 0;
    const nextRank = STATUS_RANK[status] ?? 0;
    if (nextRank < currentRank) {
      await markStepCompleted(enrollment, step, "action_skipped", {
        action: step.stepType,
        reason: "status_downgrade_blocked",
        currentStatus: contact.contactStatus,
        requestedStatus: status,
      });
      return;
    }

    await db
      .update(contacts)
      .set({ contactStatus: status, updatedAt: new Date().toISOString() })
      .where(eq(contacts.id, enrollment.contactId));
    await writeContactTimelineEvent(
      enrollment.contactId,
      "status_changed",
      `Status changed to ${status} by automation`,
      {
        new_status: status,
        old_status: contact.contactStatus,
        automation_step_id: step.id,
        automation_enrollment_id: enrollment.id,
      },
    );

    await markStepCompleted(enrollment, step, "action_completed", {
      action: step.stepType,
      status,
      previousStatus: contact.contactStatus,
    });
    return;
  }

  await markStepCompleted(enrollment, step, "action_skipped", {
    action: step.stepType,
    reason: "unsupported_action",
  });
}

async function markStepCompleted(
  enrollment: typeof automationEnrollments.$inferSelect,
  step: typeof automationSteps.$inferSelect,
  eventType: "wait_completed" | "action_completed" | "action_skipped",
  eventData?: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(automationEnrollments)
    .set({
      currentStepId: step.id,
      currentStepOrder: step.stepOrder,
      lastEventAt: now,
      updatedAt: now,
    })
    .where(eq(automationEnrollments.id, enrollment.id));

  await db.insert(automationEvents).values({
    flowId: enrollment.flowId,
    stepId: step.id,
    enrollmentId: enrollment.id,
    subscriberId: enrollment.subscriberId,
    contactId: enrollment.contactId,
    eventType,
    eventData,
    createdAt: now,
  });
}

function parseActionSettings(value: unknown): AutomationActionSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AutomationActionSettings;
}

function normalizeTags(value: unknown): string[] {
  const rawTags = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [
    ...new Set(
      rawTags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

async function writeContactTimelineEvent(
  contactId: string,
  eventType: "status_changed" | "tags_updated",
  title: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.insert(contactTimeline).values({
    contactId,
    eventType,
    title,
    metadata,
  });
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const status = value.trim();
  return status.length > 0 ? status : null;
}

function getAutomationFromEmail(flowFromEmail: string | null): string {
  const email =
    flowFromEmail || process.env.NEWSLETTER_FROM_EMAIL || process.env.DEFAULT_FROM_EMAIL;
  if (!email) {
    throw new Error("NEWSLETTER_FROM_EMAIL or DEFAULT_FROM_EMAIL is required for automation sends");
  }
  return email;
}

function buildTokens(
  enrollment: typeof automationEnrollments.$inferSelect,
  subscriber: typeof newsletterSubscribers.$inferSelect | null,
  contact: typeof contacts.$inferSelect | null,
  unsubscribeUrl: string,
): Record<string, string> {
  const metadata = enrollment.metadata as Record<string, unknown> | null;
  const firstName =
    subscriber?.firstName ?? contact?.firstName ?? stringFromMetadata(metadata, "firstName");
  const lastName =
    subscriber?.lastName ?? contact?.lastName ?? stringFromMetadata(metadata, "lastName");
  const businessName = subscriber?.businessName ?? stringFromMetadata(metadata, "businessName");
  const company = contact?.company ?? stringFromMetadata(metadata, "company") ?? businessName;

  return {
    first_name: escapeHtml(firstName ?? ""),
    last_name: escapeHtml(lastName ?? ""),
    email: escapeHtml(enrollment.email),
    business_name: escapeHtml(businessName ?? ""),
    company: escapeHtml(company ?? ""),
    unsubscribe_url: unsubscribeUrl,
  };
}

function substituteTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => tokens[key] ?? match);
}

function stringFromMetadata(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
