import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  automationDispatchOutbox,
  automationEnrollments,
  automationEvents,
  automationNodeRuns,
  automationWorkflowEdges,
  automationWorkflowNodes,
} from "@/lib/db/schema";

export async function markNodeDeadLetter(input: {
  tenantId: string;
  enrollmentId: string;
  operationKey: string;
  reason: string;
}) {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const [run] = await tx
      .update(automationNodeRuns)
      .set({ status: "dead_letter", errorData: { message: input.reason }, settledAt: now })
      .where(
        and(
          eq(automationNodeRuns.tenantId, input.tenantId),
          eq(automationNodeRuns.enrollmentId, input.enrollmentId),
          eq(automationNodeRuns.operationKey, input.operationKey),
          eq(automationNodeRuns.status, "retryable"),
        ),
      )
      .returning({ id: automationNodeRuns.id });
    if (!run) return;
    await tx
      .update(automationEnrollments)
      .set({ status: "dead_letter", updatedAt: now })
      .where(
        and(
          eq(automationEnrollments.id, input.enrollmentId),
          eq(automationEnrollments.tenantId, input.tenantId),
        ),
      );
  });
}

export async function retryEnrollmentNode(input: {
  tenantId: string;
  enrollmentId: string;
  actorId: string;
  reason: string;
}) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(automationNodeRuns)
      .where(
        and(
          eq(automationNodeRuns.tenantId, input.tenantId),
          eq(automationNodeRuns.enrollmentId, input.enrollmentId),
          inArray(automationNodeRuns.status, ["failed", "dead_letter"]),
        ),
      )
      .orderBy(desc(automationNodeRuns.attempt))
      .limit(1);
    if (!run) throw new Error("Retryable failed node not found");
    if (run.attempt >= 3) throw new Error("Maximum node attempts reached");
    const attempt = run.attempt + 1;
    await tx
      .insert(automationDispatchOutbox)
      .values({
        tenantId: input.tenantId,
        enrollmentId: input.enrollmentId,
        runId: run.id,
        revisionId: run.revisionId,
        successorNodeKey: run.nodeKey,
        operationKey: `${input.enrollmentId}:${run.nodeKey}:${attempt}`,
        dedupKey: `admin-retry:${run.id}:${attempt}`,
      })
      .onConflictDoNothing();
    await tx
      .update(automationEnrollments)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(automationEnrollments.id, input.enrollmentId),
          eq(automationEnrollments.tenantId, input.tenantId),
        ),
      );
    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      enrollmentId: input.enrollmentId,
      eventType: "node_retry_requested",
      eventData: { runId: run.id, actorId: input.actorId, reason: input.reason, attempt },
    });
    return { runId: run.id, attempt };
  });
}

export async function skipEnrollmentNode(input: {
  tenantId: string;
  enrollmentId: string;
  actorId: string;
  reason: string;
}) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(automationNodeRuns)
      .where(
        and(
          eq(automationNodeRuns.tenantId, input.tenantId),
          eq(automationNodeRuns.enrollmentId, input.enrollmentId),
          inArray(automationNodeRuns.status, ["failed", "dead_letter"]),
        ),
      )
      .orderBy(desc(automationNodeRuns.attempt))
      .limit(1);
    if (!run) throw new Error("Failed node not found");
    const [node] = await tx
      .select({ type: automationWorkflowNodes.nodeType })
      .from(automationWorkflowNodes)
      .where(
        and(
          eq(automationWorkflowNodes.tenantId, input.tenantId),
          eq(automationWorkflowNodes.revisionId, run.revisionId),
          eq(automationWorkflowNodes.nodeKey, run.nodeKey),
        ),
      )
      .limit(1);
    if (!node || node.type === "trigger" || node.type === "condition") {
      throw new Error("Trigger and condition nodes cannot be skipped");
    }
    const [edge] = await tx
      .select({ target: automationWorkflowEdges.targetNodeKey })
      .from(automationWorkflowEdges)
      .where(
        and(
          eq(automationWorkflowEdges.tenantId, input.tenantId),
          eq(automationWorkflowEdges.revisionId, run.revisionId),
          eq(automationWorkflowEdges.sourceNodeKey, run.nodeKey),
          eq(automationWorkflowEdges.sourceHandle, "default"),
        ),
      )
      .limit(1);
    const now = new Date().toISOString();
    await tx
      .update(automationNodeRuns)
      .set({ status: "skipped", selectedOutput: "default", settledAt: now })
      .where(
        and(eq(automationNodeRuns.id, run.id), eq(automationNodeRuns.tenantId, input.tenantId)),
      );
    if (edge) {
      await tx
        .insert(automationDispatchOutbox)
        .values({
          tenantId: input.tenantId,
          enrollmentId: input.enrollmentId,
          runId: run.id,
          revisionId: run.revisionId,
          successorNodeKey: edge.target,
          operationKey: `${input.enrollmentId}:${edge.target}:1`,
          dedupKey: `admin-skip:${run.id}:${edge.target}`,
        })
        .onConflictDoNothing();
      await tx
        .update(automationEnrollments)
        .set({ status: "active", updatedAt: now })
        .where(
          and(
            eq(automationEnrollments.id, input.enrollmentId),
            eq(automationEnrollments.tenantId, input.tenantId),
          ),
        );
    } else {
      await tx
        .update(automationEnrollments)
        .set({ status: "completed", updatedAt: now })
        .where(
          and(
            eq(automationEnrollments.id, input.enrollmentId),
            eq(automationEnrollments.tenantId, input.tenantId),
          ),
        );
    }
    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      enrollmentId: input.enrollmentId,
      eventType: "node_skipped",
      eventData: { runId: run.id, actorId: input.actorId, reason: input.reason },
    });
    return { runId: run.id, successor: edge?.target ?? null };
  });
}

export async function cancelGraphEnrollment(input: {
  tenantId: string;
  enrollmentId: string;
  actorId: string;
  reason: string;
}) {
  return db.transaction(async (tx) => {
    const now = new Date().toISOString();
    const [enrollment] = await tx
      .update(automationEnrollments)
      .set({ status: "cancelled", stopReason: input.reason, stoppedAt: now, updatedAt: now })
      .where(
        and(
          eq(automationEnrollments.id, input.enrollmentId),
          eq(automationEnrollments.tenantId, input.tenantId),
        ),
      )
      .returning({ id: automationEnrollments.id });
    if (!enrollment) throw new Error("Enrollment not found in tenant");
    await tx
      .update(automationDispatchOutbox)
      .set({ cancelledAt: now })
      .where(
        and(
          eq(automationDispatchOutbox.tenantId, input.tenantId),
          eq(automationDispatchOutbox.enrollmentId, input.enrollmentId),
          isNull(automationDispatchOutbox.publishedAt),
        ),
      );
    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      enrollmentId: input.enrollmentId,
      eventType: "enrollment_cancelled",
      eventData: { actorId: input.actorId, reason: input.reason },
    });
    return enrollment;
  });
}
