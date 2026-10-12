import { and, eq, isNull } from "drizzle-orm";
import {
  automationDispatchOutbox,
  automationEnrollments,
  automationEvents,
  automationFlows,
  automationWorkflowNodes,
  contacts,
  newsletterSubscribers,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { enqueueAutomationSendStep } from "@/lib/queue";
import { calculateStepRunAt, getNextAutomationStep } from "./steps";
import type { AutomationEnrollmentStatus } from "./types";

export type AutomationEnrollment = typeof automationEnrollments.$inferSelect;

export async function enrollSubscriberInActiveFlows(
  subscriberId: string,
): Promise<AutomationEnrollment[]> {
  const flows = await db
    .select()
    .from(automationFlows)
    .where(
      and(
        eq(automationFlows.status, "active"),
        eq(automationFlows.triggerType, "newsletter_subscriber_verified"),
      ),
    );

  const enrollments: AutomationEnrollment[] = [];
  for (const flow of flows) {
    const enrollment = await enrollSubscriberInFlow(flow.id, subscriberId);
    if (enrollment) {
      enrollments.push(enrollment);
    }
  }

  return enrollments;
}

export async function enrollSubscriberInFlow(
  flowId: string,
  subscriberId: string,
  tenantId?: string,
): Promise<AutomationEnrollment | null> {
  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(
      tenantId
        ? and(eq(automationFlows.id, flowId), eq(automationFlows.tenantId, tenantId))
        : eq(automationFlows.id, flowId),
    )
    .limit(1);
  if (
    !flow ||
    flow.status !== "active" ||
    (flow.executionMode === "graph" && (!flow.tenantId || !flow.publishedRevisionId))
  ) {
    return null;
  }

  const subscriberTenant = flow.tenantId
    ? eq(newsletterSubscribers.tenantId, flow.tenantId)
    : isNull(newsletterSubscribers.tenantId);
  const [subscriber] = await db
    .select()
    .from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.id, subscriberId), subscriberTenant))
    .limit(1);

  if (!subscriber?.verified || subscriber.unsubscribed) {
    return null;
  }

  const existing = await getEnrollmentBySubscriber(flowId, subscriberId);
  if (existing) {
    return existing;
  }

  const enrollment = await createEnrollment({
    flowId,
    tenantId: flow.tenantId,
    revisionId: flow.executionMode === "graph" ? flow.publishedRevisionId : null,
    subscriberId,
    contactId: null,
    email: subscriber.email,
    metadata: {
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      businessName: subscriber.businessName,
      source: subscriber.source,
    },
  });

  await scheduleEnrollmentNextStep(enrollment.id);
  return enrollment;
}

export async function enrollContactInFlow(
  flowId: string,
  contactId: string,
  tenantId?: string,
): Promise<AutomationEnrollment | null> {
  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(
      tenantId
        ? and(eq(automationFlows.id, flowId), eq(automationFlows.tenantId, tenantId))
        : eq(automationFlows.id, flowId),
    )
    .limit(1);
  if (
    !flow ||
    flow.status !== "active" ||
    (flow.executionMode === "graph" && (!flow.tenantId || !flow.publishedRevisionId))
  ) {
    return null;
  }

  const contactTenant = flow.tenantId
    ? eq(contacts.tenantId, flow.tenantId)
    : isNull(contacts.tenantId);
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), contactTenant))
    .limit(1);
  if (!contact) {
    return null;
  }

  const existing = await getEnrollmentByContact(flowId, contactId);
  if (existing) {
    return existing;
  }

  const enrollment = await createEnrollment({
    flowId,
    tenantId: flow.tenantId,
    revisionId: flow.executionMode === "graph" ? flow.publishedRevisionId : null,
    subscriberId: null,
    contactId,
    email: contact.email,
    metadata: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      businessName: contact.company,
      company: contact.company,
    },
  });

  await scheduleEnrollmentNextStep(enrollment.id);
  return enrollment;
}

export async function stopEnrollment(
  enrollmentId: string,
  reason: string,
  status: AutomationEnrollmentStatus = "stopped",
): Promise<AutomationEnrollment | null> {
  const now = new Date().toISOString();
  const [enrollment] = await db
    .update(automationEnrollments)
    .set({
      status,
      engagementStage: "stopped",
      stoppedAt: now,
      stopReason: reason,
      nextStepAt: null,
      lastEventAt: now,
      updatedAt: now,
    })
    .where(eq(automationEnrollments.id, enrollmentId))
    .returning();

  if (enrollment) {
    await db.insert(automationEvents).values({
      tenantId: enrollment.tenantId,
      flowId: enrollment.flowId,
      enrollmentId: enrollment.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      eventType: status === "unsubscribed" ? "unsubscribed" : "stopped",
      eventData: { reason, status },
      createdAt: now,
    });
  }

  return enrollment ?? null;
}

export async function markEnrollmentConverted(
  enrollmentId: string,
  reason: string,
): Promise<AutomationEnrollment | null> {
  const now = new Date().toISOString();
  const [enrollment] = await db
    .update(automationEnrollments)
    .set({
      status: "converted",
      engagementStage: "converted",
      convertedAt: now,
      stopReason: reason,
      nextStepAt: null,
      lastEventAt: now,
      updatedAt: now,
    })
    .where(eq(automationEnrollments.id, enrollmentId))
    .returning();

  if (enrollment) {
    await db.insert(automationEvents).values({
      tenantId: enrollment.tenantId,
      flowId: enrollment.flowId,
      enrollmentId: enrollment.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      eventType: "converted",
      eventData: { reason },
      createdAt: now,
    });
  }

  return enrollment ?? null;
}

export async function advanceEnrollmentToNextStep(
  enrollmentId: string,
): Promise<AutomationEnrollment | null> {
  return scheduleEnrollmentNextStep(enrollmentId);
}

export async function scheduleEnrollmentNextStep(
  enrollmentId: string,
): Promise<AutomationEnrollment | null> {
  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(eq(automationEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.status !== "active") {
    return enrollment ?? null;
  }

  if (enrollment.tenantId && enrollment.revisionId) {
    const [trigger] = await db
      .select({ nodeKey: automationWorkflowNodes.nodeKey })
      .from(automationWorkflowNodes)
      .where(
        and(
          eq(automationWorkflowNodes.tenantId, enrollment.tenantId),
          eq(automationWorkflowNodes.revisionId, enrollment.revisionId),
          eq(automationWorkflowNodes.nodeType, "trigger"),
        ),
      )
      .limit(1);
    if (!trigger) throw new Error("Published graph trigger not found");
    await db
      .insert(automationDispatchOutbox)
      .values({
        tenantId: enrollment.tenantId,
        enrollmentId: enrollment.id,
        revisionId: enrollment.revisionId,
        successorNodeKey: trigger.nodeKey,
        operationKey: `${enrollment.id}:${trigger.nodeKey}:1`,
        dedupKey: `enrollment-start:${enrollment.id}:${enrollment.revisionId}`,
      })
      .onConflictDoNothing();
    return enrollment;
  }

  const nextStep = await getNextAutomationStep(enrollment.flowId, enrollment.currentStepOrder);
  const now = new Date();
  const nowIso = now.toISOString();

  if (!nextStep) {
    const [completed] = await db
      .update(automationEnrollments)
      .set({
        status: "completed",
        nextStepAt: null,
        lastEventAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(automationEnrollments.id, enrollment.id))
      .returning();

    if (completed) {
      await db.insert(automationEvents).values({
        flowId: completed.flowId,
        enrollmentId: completed.id,
        subscriberId: completed.subscriberId,
        contactId: completed.contactId,
        eventType: "completed",
        createdAt: nowIso,
      });
    }

    return completed ?? null;
  }

  const runAt = calculateStepRunAt(nextStep, now);
  const [updated] = await db
    .update(automationEnrollments)
    .set({
      currentStepId: nextStep.id,
      nextStepAt: runAt.toISOString(),
      updatedAt: nowIso,
    })
    .where(eq(automationEnrollments.id, enrollment.id))
    .returning();

  if (!updated) {
    return null;
  }

  await db.insert(automationEvents).values({
    flowId: updated.flowId,
    stepId: nextStep.id,
    enrollmentId: updated.id,
    subscriberId: updated.subscriberId,
    contactId: updated.contactId,
    eventType: "step_queued",
    eventData: {
      stepOrder: nextStep.stepOrder,
      stepType: nextStep.stepType,
      runAt: runAt.toISOString(),
    },
    createdAt: nowIso,
  });

  const startAfterSeconds = Math.max(0, Math.ceil((runAt.getTime() - now.getTime()) / 1000));
  await enqueueAutomationSendStep(
    {
      enrollmentId: updated.id,
      flowId: updated.flowId,
      stepId: nextStep.id,
      expectedStepOrder: nextStep.stepOrder,
    },
    { startAfter: startAfterSeconds },
  );

  return updated;
}

async function getEnrollmentBySubscriber(
  flowId: string,
  subscriberId: string,
): Promise<AutomationEnrollment | null> {
  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(
      and(
        eq(automationEnrollments.flowId, flowId),
        eq(automationEnrollments.subscriberId, subscriberId),
      ),
    )
    .limit(1);

  return enrollment ?? null;
}

async function getEnrollmentByContact(
  flowId: string,
  contactId: string,
): Promise<AutomationEnrollment | null> {
  const [enrollment] = await db
    .select()
    .from(automationEnrollments)
    .where(
      and(eq(automationEnrollments.flowId, flowId), eq(automationEnrollments.contactId, contactId)),
    )
    .limit(1);

  return enrollment ?? null;
}

async function createEnrollment(input: {
  flowId: string;
  tenantId: string | null;
  revisionId: string | null;
  subscriberId: string | null;
  contactId: string | null;
  email: string;
  metadata: unknown;
}): Promise<AutomationEnrollment> {
  const now = new Date().toISOString();
  const [enrollment] = await db
    .insert(automationEnrollments)
    .values({
      flowId: input.flowId,
      tenantId: input.tenantId,
      revisionId: input.revisionId,
      subscriberId: input.subscriberId,
      contactId: input.contactId,
      email: input.email,
      status: "active",
      engagementStage: "enrolled",
      metadata: input.metadata,
      lastEventAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  const created =
    enrollment ??
    (input.subscriberId
      ? await getEnrollmentBySubscriber(input.flowId, input.subscriberId)
      : input.contactId
        ? await getEnrollmentByContact(input.flowId, input.contactId)
        : null);

  if (!created) {
    throw new Error("Failed to create automation enrollment");
  }

  if (enrollment) {
    await db.insert(automationEvents).values({
      tenantId: enrollment.tenantId,
      flowId: enrollment.flowId,
      enrollmentId: enrollment.id,
      subscriberId: enrollment.subscriberId,
      contactId: enrollment.contactId,
      eventType: "enrolled",
      eventData: { email: enrollment.email },
      createdAt: now,
    });
  }

  return created;
}
