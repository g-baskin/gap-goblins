import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  automationCallTasks,
  automationDispatchOutbox,
  automationEnrollments,
  automationEvents,
  automationNodeRuns,
  automationWorkflowEdges,
  contacts,
  tenantMemberships,
} from "@/lib/db/schema";
import type { ActionDatabase, ActionExecutionContext, ActionExecutionResult } from "./types";

export async function createCallTask(
  database: ActionDatabase,
  context: ActionExecutionContext,
  values: {
    script: string;
    dueOffsetMinutes: number;
    assignedToUserId?: string;
    dealId?: string;
  },
): Promise<ActionExecutionResult> {
  const [contact] = await database
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)))
    .limit(1);
  if (!contact) throw new Error("Contact not found in tenant");
  if (values.assignedToUserId) {
    const [assignee] = await database
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, context.tenantId),
          eq(tenantMemberships.userId, values.assignedToUserId),
          eq(tenantMemberships.status, "active"),
        ),
      )
      .limit(1);
    if (!assignee) throw new Error("Call task assignee is not active in tenant");
  }
  const dueAt = new Date((context.now ?? new Date()).getTime() + values.dueOffsetMinutes * 60_000);
  await database
    .insert(automationCallTasks)
    .values({
      tenantId: context.tenantId,
      enrollmentId: context.enrollmentId,
      sourceRunId: context.runId,
      contactId: contact.id,
      dealId: values.dealId ?? context.dealId,
      assignedToUserId: values.assignedToUserId,
      script: values.script,
      dueAt: dueAt.toISOString(),
    })
    .onConflictDoNothing();
  const [task] = await database
    .select({ id: automationCallTasks.id, dueAt: automationCallTasks.dueAt })
    .from(automationCallTasks)
    .where(
      and(
        eq(automationCallTasks.tenantId, context.tenantId),
        eq(automationCallTasks.sourceRunId, context.runId),
      ),
    )
    .limit(1);
  if (!task) throw new Error("Call task was not created");
  return { state: "waiting", output: { callTaskId: task.id, dueAt: task.dueAt } };
}

export async function completeCallTask(input: {
  tenantId: string;
  taskId: string;
  actorId: string;
  outcome: string;
  notes?: string;
}) {
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select({
        id: automationCallTasks.id,
        enrollmentId: automationCallTasks.enrollmentId,
        sourceRunId: automationCallTasks.sourceRunId,
      })
      .from(automationCallTasks)
      .where(
        and(
          eq(automationCallTasks.id, input.taskId),
          eq(automationCallTasks.tenantId, input.tenantId),
          eq(automationCallTasks.status, "open"),
        ),
      )
      .limit(1);
    if (!task) throw new Error("Open call task not found");
    const [run] = await tx
      .select({
        id: automationNodeRuns.id,
        revisionId: automationNodeRuns.revisionId,
        nodeKey: automationNodeRuns.nodeKey,
      })
      .from(automationNodeRuns)
      .where(
        and(
          eq(automationNodeRuns.id, task.sourceRunId),
          eq(automationNodeRuns.tenantId, input.tenantId),
          eq(automationNodeRuns.status, "waiting"),
        ),
      )
      .limit(1);
    if (!run) throw new Error("Waiting call task run not found");

    const now = new Date().toISOString();
    const [completed] = await tx
      .update(automationCallTasks)
      .set({
        status: "completed",
        outcome: input.outcome,
        notes: input.notes,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(automationCallTasks.id, task.id),
          eq(automationCallTasks.tenantId, input.tenantId),
          eq(automationCallTasks.status, "open"),
        ),
      )
      .returning({ id: automationCallTasks.id });
    if (!completed) throw new Error("Call task was already completed");
    await tx
      .update(automationNodeRuns)
      .set({
        status: "succeeded",
        selectedOutput: "default",
        settledAt: now,
        outputData: { outcome: input.outcome },
      })
      .where(
        and(eq(automationNodeRuns.id, run.id), eq(automationNodeRuns.tenantId, input.tenantId)),
      );

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
    if (edge) {
      await tx
        .insert(automationDispatchOutbox)
        .values({
          tenantId: input.tenantId,
          enrollmentId: task.enrollmentId,
          runId: run.id,
          revisionId: run.revisionId,
          successorNodeKey: edge.target,
          operationKey: `${task.enrollmentId}:${edge.target}`,
          dedupKey: `call-resume:${run.id}:${edge.target}`,
        })
        .onConflictDoNothing();
    } else {
      await tx
        .update(automationEnrollments)
        .set({ status: "completed", updatedAt: now, lastEventAt: now })
        .where(
          and(
            eq(automationEnrollments.id, task.enrollmentId),
            eq(automationEnrollments.tenantId, input.tenantId),
          ),
        );
    }
    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      enrollmentId: task.enrollmentId,
      eventType: "call_task_completed",
      eventData: { taskId: task.id, actorId: input.actorId, outcome: input.outcome },
    });
    return { taskId: task.id, resumed: Boolean(edge) };
  });
}
