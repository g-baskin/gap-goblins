import { and, asc, desc, eq, max } from "drizzle-orm";
import { validateOutboundWebhookUrl } from "@/lib/automation/webhooks/outbound";
import { db } from "@/lib/db";
import {
  automationEvents,
  automationFlows,
  automationWebhookEndpoints,
  automationWorkflowEdges,
  automationWorkflowNodes,
  automationWorkflowRevisions,
} from "@/lib/db/schema";
import { automationGraphSchema } from "@/lib/validations/automation-graph";
import { createInboundWebhookCredentials } from "../webhooks/inbound";
import { compileAutomationGraph, hashAutomationGraph } from "./compiler";
import type { AutomationGraph } from "./types";

export class RevisionConflictError extends Error {
  constructor() {
    super("Draft changed since it was loaded");
    this.name = "RevisionConflictError";
  }
}

export class RevisionNotFoundError extends Error {
  constructor(message = "Workflow revision not found") {
    super(message);
    this.name = "RevisionNotFoundError";
  }
}

function persistedGraph(
  nodes: Array<{
    nodeKey: string;
    nodeType: string;
    name: string;
    positionX: number;
    positionY: number;
    config: unknown;
  }>,
  edges: Array<{
    id: string;
    sourceNodeKey: string;
    targetNodeKey: string;
    sourceHandle: string;
    edgeOrder: number;
  }>,
): AutomationGraph {
  return automationGraphSchema.parse({
    nodes: nodes.map((node) => ({
      key: node.nodeKey,
      type: node.nodeType,
      name: node.name,
      position: { x: node.positionX, y: node.positionY },
      config: node.config,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeKey,
      target: edge.targetNodeKey,
      sourceHandle: edge.sourceHandle,
      order: edge.edgeOrder,
    })),
  });
}

async function loadRevisionGraph(
  executor: Pick<typeof db, "select">,
  tenantId: string,
  revisionId: string,
): Promise<AutomationGraph> {
  const [nodes, edges] = await Promise.all([
    executor
      .select({
        nodeKey: automationWorkflowNodes.nodeKey,
        nodeType: automationWorkflowNodes.nodeType,
        name: automationWorkflowNodes.name,
        positionX: automationWorkflowNodes.positionX,
        positionY: automationWorkflowNodes.positionY,
        config: automationWorkflowNodes.config,
      })
      .from(automationWorkflowNodes)
      .where(
        and(
          eq(automationWorkflowNodes.tenantId, tenantId),
          eq(automationWorkflowNodes.revisionId, revisionId),
        ),
      ),
    executor
      .select({
        id: automationWorkflowEdges.id,
        sourceNodeKey: automationWorkflowEdges.sourceNodeKey,
        targetNodeKey: automationWorkflowEdges.targetNodeKey,
        sourceHandle: automationWorkflowEdges.sourceHandle,
        edgeOrder: automationWorkflowEdges.edgeOrder,
      })
      .from(automationWorkflowEdges)
      .where(
        and(
          eq(automationWorkflowEdges.tenantId, tenantId),
          eq(automationWorkflowEdges.revisionId, revisionId),
        ),
      )
      .orderBy(asc(automationWorkflowEdges.edgeOrder)),
  ]);
  return persistedGraph(nodes, edges);
}

export async function loadWorkflowDraft(tenantId: string, flowId: string) {
  const [flow] = await db
    .select({ draftRevisionId: automationFlows.draftRevisionId })
    .from(automationFlows)
    .where(and(eq(automationFlows.id, flowId), eq(automationFlows.tenantId, tenantId)))
    .limit(1);
  if (!flow?.draftRevisionId) return null;

  const [revision] = await db
    .select({
      id: automationWorkflowRevisions.id,
      version: automationWorkflowRevisions.version,
      optimisticToken: automationWorkflowRevisions.optimisticToken,
    })
    .from(automationWorkflowRevisions)
    .where(
      and(
        eq(automationWorkflowRevisions.id, flow.draftRevisionId),
        eq(automationWorkflowRevisions.tenantId, tenantId),
        eq(automationWorkflowRevisions.lifecycle, "draft"),
      ),
    )
    .limit(1);
  if (!revision) return null;
  return { ...revision, graph: await loadRevisionGraph(db, tenantId, revision.id) };
}

export async function listWorkflowRevisions(tenantId: string, flowId: string) {
  return db
    .select({
      id: automationWorkflowRevisions.id,
      version: automationWorkflowRevisions.version,
      lifecycle: automationWorkflowRevisions.lifecycle,
      publishedAt: automationWorkflowRevisions.publishedAt,
    })
    .from(automationWorkflowRevisions)
    .where(
      and(
        eq(automationWorkflowRevisions.tenantId, tenantId),
        eq(automationWorkflowRevisions.flowId, flowId),
      ),
    )
    .orderBy(desc(automationWorkflowRevisions.version));
}

async function replaceGraphRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  revisionId: string,
  graph: AutomationGraph,
) {
  await tx
    .delete(automationWorkflowEdges)
    .where(
      and(
        eq(automationWorkflowEdges.tenantId, tenantId),
        eq(automationWorkflowEdges.revisionId, revisionId),
      ),
    );
  await tx
    .delete(automationWorkflowNodes)
    .where(
      and(
        eq(automationWorkflowNodes.tenantId, tenantId),
        eq(automationWorkflowNodes.revisionId, revisionId),
      ),
    );
  await tx.insert(automationWorkflowNodes).values(
    graph.nodes.map((node) => ({
      tenantId,
      revisionId,
      nodeKey: node.key,
      nodeType: node.type,
      name: node.name,
      positionX: node.position.x,
      positionY: node.position.y,
      config: node.config,
    })),
  );
  if (graph.edges.length) {
    await tx.insert(automationWorkflowEdges).values(
      graph.edges.map((edge) => ({
        tenantId,
        revisionId,
        sourceNodeKey: edge.source,
        targetNodeKey: edge.target,
        sourceHandle: edge.sourceHandle,
        edgeOrder: edge.order,
      })),
    );
  }
}

async function validateGraphNetworkTargets(graph: AutomationGraph) {
  await Promise.all(
    graph.nodes
      .filter((node) => node.type === "outbound_webhook")
      .map((node) => validateOutboundWebhookUrl(node.config.url)),
  );
}

export async function saveWorkflowDraft(input: {
  tenantId: string;
  flowId: string;
  userId: string;
  optimisticToken?: string;
  graph: unknown;
}) {
  const graph = automationGraphSchema.parse(input.graph);
  await validateGraphNetworkTargets(graph);
  const graphHash = hashAutomationGraph(graph);
  return db.transaction(async (tx) => {
    const [flow] = await tx
      .select({ id: automationFlows.id, draftRevisionId: automationFlows.draftRevisionId })
      .from(automationFlows)
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      )
      .limit(1);
    if (!flow) throw new RevisionNotFoundError("Workflow not found");

    let revisionId = flow.draftRevisionId;
    let optimisticToken: string;
    if (revisionId) {
      if (!input.optimisticToken) throw new RevisionConflictError();
      const [updated] = await tx
        .update(automationWorkflowRevisions)
        .set({
          graphHash,
          optimisticToken: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(automationWorkflowRevisions.id, revisionId),
            eq(automationWorkflowRevisions.tenantId, input.tenantId),
            eq(automationWorkflowRevisions.lifecycle, "draft"),
            eq(automationWorkflowRevisions.optimisticToken, input.optimisticToken),
          ),
        )
        .returning({ optimisticToken: automationWorkflowRevisions.optimisticToken });
      if (!updated) throw new RevisionConflictError();
      optimisticToken = updated.optimisticToken;
    } else {
      const [{ latestVersion }] = await tx
        .select({ latestVersion: max(automationWorkflowRevisions.version) })
        .from(automationWorkflowRevisions)
        .where(
          and(
            eq(automationWorkflowRevisions.tenantId, input.tenantId),
            eq(automationWorkflowRevisions.flowId, input.flowId),
          ),
        );
      const [created] = await tx
        .insert(automationWorkflowRevisions)
        .values({
          tenantId: input.tenantId,
          flowId: input.flowId,
          version: (latestVersion ?? 0) + 1,
          lifecycle: "draft",
          graphHash,
          authorId: input.userId,
        })
        .returning({
          id: automationWorkflowRevisions.id,
          optimisticToken: automationWorkflowRevisions.optimisticToken,
        });
      if (!created) throw new Error("Draft creation failed");
      revisionId = created.id;
      optimisticToken = created.optimisticToken;
      await tx
        .update(automationFlows)
        .set({ draftRevisionId: revisionId })
        .where(
          and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
        );
    }

    await replaceGraphRows(tx, input.tenantId, revisionId, graph);
    return { revisionId, optimisticToken, graphHash };
  });
}

export async function publishWorkflow(input: {
  tenantId: string;
  flowId: string;
  userId: string;
  optimisticToken: string;
}) {
  return db.transaction(async (tx) => {
    const [flow] = await tx
      .select({
        draftRevisionId: automationFlows.draftRevisionId,
        publishedRevisionId: automationFlows.publishedRevisionId,
      })
      .from(automationFlows)
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      )
      .limit(1);
    if (!flow?.draftRevisionId) throw new RevisionNotFoundError("Draft not found");
    const [draft] = await tx
      .select({
        optimisticToken: automationWorkflowRevisions.optimisticToken,
        version: automationWorkflowRevisions.version,
      })
      .from(automationWorkflowRevisions)
      .where(
        and(
          eq(automationWorkflowRevisions.id, flow.draftRevisionId),
          eq(automationWorkflowRevisions.tenantId, input.tenantId),
          eq(automationWorkflowRevisions.lifecycle, "draft"),
          eq(automationWorkflowRevisions.optimisticToken, input.optimisticToken),
        ),
      )
      .limit(1);
    if (!draft) throw new RevisionConflictError();

    const compiled = compileAutomationGraph(
      await loadRevisionGraph(
        tx as Pick<typeof db, "select">,
        input.tenantId,
        flow.draftRevisionId,
      ),
    );
    await validateGraphNetworkTargets(compiled.graph);
    const now = new Date().toISOString();
    if (flow.publishedRevisionId) {
      await tx
        .update(automationWorkflowRevisions)
        .set({ lifecycle: "superseded", supersededAt: now })
        .where(
          and(
            eq(automationWorkflowRevisions.id, flow.publishedRevisionId),
            eq(automationWorkflowRevisions.tenantId, input.tenantId),
          ),
        );
    }
    await tx
      .update(automationWorkflowRevisions)
      .set({
        lifecycle: "published",
        graphHash: compiled.graphHash,
        publishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(automationWorkflowRevisions.id, flow.draftRevisionId),
          eq(automationWorkflowRevisions.tenantId, input.tenantId),
        ),
      );
    const [nextDraft] = await tx
      .insert(automationWorkflowRevisions)
      .values({
        tenantId: input.tenantId,
        flowId: input.flowId,
        version: draft.version + 1,
        lifecycle: "draft",
        graphHash: compiled.graphHash,
        authorId: input.userId,
      })
      .returning({ id: automationWorkflowRevisions.id });
    if (!nextDraft) throw new Error("Failed to create the next editable draft");
    await replaceGraphRows(tx, input.tenantId, nextDraft.id, compiled.graph);
    await tx
      .update(automationFlows)
      .set({
        executionMode: "graph",
        draftRevisionId: nextDraft.id,
        publishedRevisionId: flow.draftRevisionId,
        updatedAt: now,
      })
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      );

    let webhookCredentials: ReturnType<typeof createInboundWebhookCredentials> | undefined;
    await tx
      .update(automationWebhookEndpoints)
      .set({ status: "inactive", updatedAt: now })
      .where(
        and(
          eq(automationWebhookEndpoints.tenantId, input.tenantId),
          eq(automationWebhookEndpoints.flowId, input.flowId),
        ),
      );
    const inboundTrigger = compiled.graph.nodes.find(
      (node) => node.type === "trigger" && node.config.triggerType === "signed_inbound_webhook",
    );
    if (inboundTrigger) {
      const [endpoint] = await tx
        .select({ id: automationWebhookEndpoints.id })
        .from(automationWebhookEndpoints)
        .where(
          and(
            eq(automationWebhookEndpoints.tenantId, input.tenantId),
            eq(automationWebhookEndpoints.flowId, input.flowId),
            eq(automationWebhookEndpoints.nodeKey, inboundTrigger.key),
          ),
        )
        .limit(1);
      if (endpoint) {
        await tx
          .update(automationWebhookEndpoints)
          .set({ status: "active", updatedAt: now })
          .where(
            and(
              eq(automationWebhookEndpoints.id, endpoint.id),
              eq(automationWebhookEndpoints.tenantId, input.tenantId),
            ),
          );
      } else {
        webhookCredentials = createInboundWebhookCredentials();
        await tx.insert(automationWebhookEndpoints).values({
          tenantId: input.tenantId,
          flowId: input.flowId,
          nodeKey: inboundTrigger.key,
          publicHookId: webhookCredentials.hookId,
          secretReference: webhookCredentials.secretReference,
          signingSecretHash: webhookCredentials.signingSecretHash,
        });
      }
    }

    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      flowId: input.flowId,
      eventType: "workflow_published",
      eventData: { revisionId: flow.draftRevisionId, actorId: input.userId },
    });
    return {
      revisionId: flow.draftRevisionId,
      graphHash: compiled.graphHash,
      ...(webhookCredentials && {
        webhook: { hookId: webhookCredentials.hookId, secret: webhookCredentials.secret },
      }),
    };
  });
}

export async function rollbackWorkflowRevision(input: {
  tenantId: string;
  flowId: string;
  revisionId: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [revision] = await tx
      .select({ id: automationWorkflowRevisions.id })
      .from(automationWorkflowRevisions)
      .where(
        and(
          eq(automationWorkflowRevisions.id, input.revisionId),
          eq(automationWorkflowRevisions.tenantId, input.tenantId),
          eq(automationWorkflowRevisions.flowId, input.flowId),
          eq(automationWorkflowRevisions.lifecycle, "superseded"),
        ),
      )
      .orderBy(desc(automationWorkflowRevisions.version))
      .limit(1);
    if (!revision) throw new RevisionNotFoundError("Published revision not found");
    const compiled = compileAutomationGraph(
      await loadRevisionGraph(tx as Pick<typeof db, "select">, input.tenantId, revision.id),
    );
    await validateGraphNetworkTargets(compiled.graph);
    const [flow] = await tx
      .update(automationFlows)
      .set({ publishedRevisionId: revision.id, updatedAt: new Date().toISOString() })
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      )
      .returning({ id: automationFlows.id });
    if (!flow) throw new RevisionNotFoundError("Workflow not found");
    await tx.insert(automationEvents).values({
      tenantId: input.tenantId,
      flowId: input.flowId,
      eventType: "workflow_revision_rolled_back",
      eventData: { revisionId: revision.id, actorId: input.userId },
    });
    return { revisionId: revision.id };
  });
}
