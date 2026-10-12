import { and, eq, max } from "drizzle-orm";
import {
  automationActionOperations,
  automationDispatchOutbox,
  automationEnrollments,
  automationEvents,
  automationNodeRuns,
  automationWorkflowEdges,
  automationWorkflowNodes,
  automationWorkflowRevisions,
  contacts,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { automationGraphNodeSchema } from "@/lib/validations/automation-graph";
import { createCallTask } from "../actions/call-task";
import { createPipelineDeal, movePipelineDeal } from "../actions/pipeline";
import { executeRegisteredAction } from "../actions/registry.server";
import { evaluateCondition } from "./conditions";
import type { AutomationGraphNode } from "./types";

export type AutomationExecuteNodePayload = {
  tenantId: string;
  enrollmentId: string;
  revisionId: string;
  nodeKey: string;
  operationKey: string;
};

export type ExternalActionResult = {
  state: "succeeded" | "unknown";
  providerReference?: string;
  metadata?: Record<string, unknown>;
};

export type GraphExternalHandlers = {
  email?: (input: {
    tenantId: string;
    enrollmentId: string;
    runId: string;
    idempotencyKey: string;
    to: string;
    config: Extract<AutomationGraphNode, { type: "email" }>["config"];
  }) => Promise<ExternalActionResult>;
  sms?: (input: {
    tenantId: string;
    enrollmentId: string;
    runId: string;
    contactId: string;
    idempotencyKey: string;
    config: Extract<AutomationGraphNode, { type: "sms" }>["config"];
  }) => Promise<ExternalActionResult>;
  outboundWebhook?: (input: {
    tenantId: string;
    enrollmentId: string;
    runId: string;
    idempotencyKey: string;
    config: Extract<AutomationGraphNode, { type: "outbound_webhook" }>["config"];
    payload: Record<string, unknown>;
  }) => Promise<ExternalActionResult>;
};

export class RetryableNodeError extends Error {}
export class PermanentNodeError extends Error {}
export class UnknownNodeOutcomeError extends Error {}

const externalNodeTypes = new Set(["email", "sms", "outbound_webhook"]);

async function ensureRun(payload: AutomationExecuteNodePayload) {
  return db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select({
        id: automationEnrollments.id,
        tenantId: automationEnrollments.tenantId,
        revisionId: automationEnrollments.revisionId,
        contactId: automationEnrollments.contactId,
        email: automationEnrollments.email,
        metadata: automationEnrollments.metadata,
        status: automationEnrollments.status,
      })
      .from(automationEnrollments)
      .where(
        and(
          eq(automationEnrollments.id, payload.enrollmentId),
          eq(automationEnrollments.tenantId, payload.tenantId),
          eq(automationEnrollments.revisionId, payload.revisionId),
        ),
      )
      .limit(1);
    if (!enrollment || !["active", "retrying"].includes(enrollment.status)) {
      throw new PermanentNodeError("Runnable tenant enrollment not found");
    }
    const [revision] = await tx
      .select({ id: automationWorkflowRevisions.id })
      .from(automationWorkflowRevisions)
      .where(
        and(
          eq(automationWorkflowRevisions.id, payload.revisionId),
          eq(automationWorkflowRevisions.tenantId, payload.tenantId),
        ),
      )
      .limit(1);
    if (!revision) throw new PermanentNodeError("Pinned workflow revision not found");
    const [nodeRow] = await tx
      .select()
      .from(automationWorkflowNodes)
      .where(
        and(
          eq(automationWorkflowNodes.tenantId, payload.tenantId),
          eq(automationWorkflowNodes.revisionId, payload.revisionId),
          eq(automationWorkflowNodes.nodeKey, payload.nodeKey),
        ),
      )
      .limit(1);
    if (!nodeRow) throw new PermanentNodeError("Workflow node not found");
    const [contact] = enrollment.contactId
      ? await tx
          .select()
          .from(contacts)
          .where(
            and(eq(contacts.id, enrollment.contactId), eq(contacts.tenantId, payload.tenantId)),
          )
          .limit(1)
      : [];
    if (enrollment.contactId && !contact) {
      throw new PermanentNodeError("Enrollment contact not found in tenant");
    }
    const node = automationGraphNodeSchema.parse({
      key: nodeRow.nodeKey,
      type: nodeRow.nodeType,
      name: nodeRow.name,
      position: { x: nodeRow.positionX, y: nodeRow.positionY },
      config: nodeRow.config,
    });

    const [{ latestAttempt }] = await tx
      .select({ latestAttempt: max(automationNodeRuns.attempt) })
      .from(automationNodeRuns)
      .where(
        and(
          eq(automationNodeRuns.tenantId, payload.tenantId),
          eq(automationNodeRuns.enrollmentId, payload.enrollmentId),
          eq(automationNodeRuns.nodeKey, payload.nodeKey),
        ),
      );
    await tx
      .insert(automationNodeRuns)
      .values({
        tenantId: payload.tenantId,
        enrollmentId: payload.enrollmentId,
        revisionId: payload.revisionId,
        nodeKey: payload.nodeKey,
        attempt: (latestAttempt ?? 0) + 1,
        operationKey: payload.operationKey,
        status: "running",
        startedAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
    const [run] = await tx
      .select()
      .from(automationNodeRuns)
      .where(
        and(
          eq(automationNodeRuns.tenantId, payload.tenantId),
          eq(automationNodeRuns.operationKey, payload.operationKey),
        ),
      )
      .limit(1);
    if (!run) throw new Error("Node run was not created");
    return { enrollment, contact: contact ?? null, node, run };
  });
}

async function ensureActionOperation(
  payload: AutomationExecuteNodePayload,
  runId: string,
  node: AutomationGraphNode,
) {
  const idempotencyKey = `${payload.tenantId}:${payload.enrollmentId}:${payload.revisionId}:${payload.nodeKey}`;
  await db
    .insert(automationActionOperations)
    .values({
      tenantId: payload.tenantId,
      runId,
      actionId: node.type,
      idempotencyKey,
      state: "pending",
    })
    .onConflictDoNothing();
  const [operation] = await db
    .select()
    .from(automationActionOperations)
    .where(
      and(
        eq(automationActionOperations.tenantId, payload.tenantId),
        eq(automationActionOperations.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  if (!operation) throw new Error("Action operation was not created");
  return operation;
}

async function executeExternal(
  payload: AutomationExecuteNodePayload,
  run: Awaited<ReturnType<typeof ensureRun>>,
  handlers: GraphExternalHandlers,
): Promise<ExternalActionResult | null> {
  if (!externalNodeTypes.has(run.node.type)) return null;
  const operation = await ensureActionOperation(payload, run.run.id, run.node);
  if (operation.state === "succeeded") {
    return {
      state: "succeeded",
      providerReference: operation.providerReference ?? undefined,
      metadata: (operation.responseMetadata as Record<string, unknown> | null) ?? undefined,
    };
  }
  if (operation.state === "unknown")
    throw new UnknownNodeOutcomeError("Provider outcome is unknown");

  let result: ExternalActionResult;
  if (run.node.type === "email") {
    if (!handlers.email) throw new PermanentNodeError("Email provider is unavailable");
    result = await handlers.email({
      tenantId: payload.tenantId,
      enrollmentId: payload.enrollmentId,
      runId: run.run.id,
      idempotencyKey: operation.idempotencyKey,
      to: run.enrollment.email,
      config: run.node.config,
    });
  } else if (run.node.type === "sms") {
    if (!run.enrollment.contactId) throw new PermanentNodeError("SMS requires a contact");
    if (!handlers.sms) throw new PermanentNodeError("SMS provider is unavailable");
    result = await handlers.sms({
      tenantId: payload.tenantId,
      enrollmentId: payload.enrollmentId,
      runId: run.run.id,
      contactId: run.enrollment.contactId,
      idempotencyKey: operation.idempotencyKey,
      config: run.node.config,
    });
  } else if (run.node.type === "outbound_webhook") {
    if (!handlers.outboundWebhook) throw new PermanentNodeError("Webhook provider is unavailable");
    result = await handlers.outboundWebhook({
      tenantId: payload.tenantId,
      enrollmentId: payload.enrollmentId,
      runId: run.run.id,
      idempotencyKey: operation.idempotencyKey,
      config: run.node.config,
      payload: {
        enrollmentId: payload.enrollmentId,
        contactId: run.enrollment.contactId,
        metadata: run.enrollment.metadata,
      },
    });
  } else {
    return null;
  }
  await db
    .update(automationActionOperations)
    .set({
      state: result.state,
      providerReference: result.providerReference,
      responseMetadata: result.metadata,
      attempts: operation.attempts + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(automationActionOperations.id, operation.id),
        eq(automationActionOperations.tenantId, payload.tenantId),
      ),
    );
  if (result.state === "unknown") throw new UnknownNodeOutcomeError("Provider outcome is unknown");
  return result;
}

export async function executeGraphNode(
  payload: AutomationExecuteNodePayload,
  handlers: GraphExternalHandlers = {},
) {
  const prepared = await ensureRun(payload);
  if (["succeeded", "waiting", "skipped", "cancelled"].includes(prepared.run.status)) {
    return { status: prepared.run.status, duplicate: true };
  }

  try {
    const externalResult = await executeExternal(payload, prepared, handlers);
    return await db.transaction(async (tx) => {
      const context = {
        tenantId: payload.tenantId,
        enrollmentId: payload.enrollmentId,
        runId: prepared.run.id,
        contactId: prepared.enrollment.contactId ?? "",
        now: new Date(),
      };
      let selectedOutput = "default";
      let output: Record<string, unknown> = externalResult?.metadata ?? {};
      let status = "succeeded";
      let delayMs = 0;

      switch (prepared.node.type) {
        case "trigger":
        case "email":
        case "sms":
        case "outbound_webhook":
          break;
        case "condition":
          selectedOutput = evaluateCondition(prepared.node.config.expression, {
            event: (prepared.enrollment.metadata as Record<string, unknown> | null) ?? {},
            contact: prepared.contact,
            contactId: prepared.enrollment.contactId,
            email: prepared.enrollment.email,
          })
            ? "true"
            : "false";
          break;
        case "wait": {
          const multiplier =
            prepared.node.config.unit === "days"
              ? 86_400_000
              : prepared.node.config.unit === "hours"
                ? 3_600_000
                : 60_000;
          delayMs = prepared.node.config.amount * multiplier;
          break;
        }
        case "add_tag": {
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          const [contact] = await tx
            .select({ tags: contacts.tags })
            .from(contacts)
            .where(and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)))
            .limit(1);
          if (!contact) throw new PermanentNodeError("Contact not found in tenant");
          await tx
            .update(contacts)
            .set({ tags: [...new Set([...(contact.tags ?? []), ...prepared.node.config.tags])] })
            .where(
              and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)),
            );
          break;
        }
        case "contact_status":
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          await tx
            .update(contacts)
            .set({ contactStatus: prepared.node.config.status })
            .where(
              and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)),
            );
          break;
        case "create_deal": {
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          const result = await createPipelineDeal(tx, context, prepared.node.config);
          output = result.output;
          break;
        }
        case "move_deal_stage": {
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          const result = await movePipelineDeal(tx, context, {
            dealId: prepared.node.config.dealId,
            stageId: prepared.node.config.stageId,
          });
          output = result.output;
          break;
        }
        case "call_task": {
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          const result = await createCallTask(tx, context, prepared.node.config);
          output = result.output;
          status = "waiting";
          break;
        }
        case "registered_custom_action": {
          if (!prepared.enrollment.contactId) throw new PermanentNodeError("Contact is required");
          const result = await executeRegisteredAction(
            prepared.node.config.actionId,
            prepared.node.config.version,
            prepared.node.config.values,
            context,
            tx,
          );
          output = result.output;
          status = result.state === "waiting" ? "waiting" : "succeeded";
          break;
        }
      }

      const now = new Date();
      await tx
        .update(automationNodeRuns)
        .set({
          status,
          selectedOutput: status === "waiting" ? null : selectedOutput,
          outputData: output,
          settledAt: status === "waiting" ? null : now.toISOString(),
        })
        .where(
          and(
            eq(automationNodeRuns.id, prepared.run.id),
            eq(automationNodeRuns.tenantId, payload.tenantId),
          ),
        );
      await tx.insert(automationEvents).values({
        tenantId: payload.tenantId,
        enrollmentId: payload.enrollmentId,
        eventType: status === "waiting" ? "node_waiting" : "node_succeeded",
        eventData: { nodeKey: payload.nodeKey, runId: prepared.run.id, output },
      });
      if (status === "waiting") return { status, runId: prepared.run.id };

      const [edge] = await tx
        .select({ target: automationWorkflowEdges.targetNodeKey })
        .from(automationWorkflowEdges)
        .where(
          and(
            eq(automationWorkflowEdges.tenantId, payload.tenantId),
            eq(automationWorkflowEdges.revisionId, payload.revisionId),
            eq(automationWorkflowEdges.sourceNodeKey, payload.nodeKey),
            eq(automationWorkflowEdges.sourceHandle, selectedOutput),
          ),
        )
        .limit(1);
      if (edge) {
        await tx
          .insert(automationDispatchOutbox)
          .values({
            tenantId: payload.tenantId,
            enrollmentId: payload.enrollmentId,
            runId: prepared.run.id,
            revisionId: payload.revisionId,
            successorNodeKey: edge.target,
            operationKey: `${payload.enrollmentId}:${edge.target}:1`,
            dedupKey: `${prepared.run.id}:${selectedOutput}:${edge.target}`,
            availableAt: new Date(now.getTime() + delayMs).toISOString(),
          })
          .onConflictDoNothing();
        if (prepared.enrollment.status === "retrying") {
          await tx
            .update(automationEnrollments)
            .set({ status: "active", lastEventAt: now.toISOString(), updatedAt: now.toISOString() })
            .where(
              and(
                eq(automationEnrollments.id, payload.enrollmentId),
                eq(automationEnrollments.tenantId, payload.tenantId),
              ),
            );
        }
      } else {
        await tx
          .update(automationEnrollments)
          .set({
            status: "completed",
            lastEventAt: now.toISOString(),
            updatedAt: now.toISOString(),
          })
          .where(
            and(
              eq(automationEnrollments.id, payload.enrollmentId),
              eq(automationEnrollments.tenantId, payload.tenantId),
            ),
          );
      }
      return { status, runId: prepared.run.id, successor: edge?.target ?? null };
    });
  } catch (error) {
    const unknown = error instanceof UnknownNodeOutcomeError;
    const retryable = error instanceof RetryableNodeError;
    const status = unknown ? "unknown" : retryable ? "retryable" : "failed";
    const message = error instanceof Error ? error.message : "Node execution failed";
    await db.transaction(async (tx) => {
      await tx
        .update(automationNodeRuns)
        .set({ status, errorData: { message }, settledAt: new Date().toISOString() })
        .where(
          and(
            eq(automationNodeRuns.id, prepared.run.id),
            eq(automationNodeRuns.tenantId, payload.tenantId),
          ),
        );
      await tx
        .update(automationEnrollments)
        .set({
          status: unknown ? "unknown" : retryable ? "retrying" : "failed",
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(automationEnrollments.id, payload.enrollmentId),
            eq(automationEnrollments.tenantId, payload.tenantId),
          ),
        );
      await tx.insert(automationEvents).values({
        tenantId: payload.tenantId,
        enrollmentId: payload.enrollmentId,
        eventType: `node_${status}`,
        eventData: { nodeKey: payload.nodeKey, runId: prepared.run.id, message },
      });
    });
    throw error;
  }
}
