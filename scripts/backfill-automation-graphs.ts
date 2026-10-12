import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  automationFlows,
  automationSteps,
  automationWorkflowEdges,
  automationWorkflowNodes,
  automationWorkflowRevisions,
} from "../lib/db/schema";
import { closeWorkerDb, db } from "../lib/db/worker";
import { automationGraphSchema } from "../lib/validations/automation-graph";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function convertStep(step: typeof automationSteps.$inferSelect, index: number) {
  const source = { legacyStepId: step.id, legacyStepOrder: step.stepOrder };
  const common = {
    key: `step-${step.id}`,
    name: step.name,
    position: { x: 360 + index * 280, y: 160 },
  };
  const settings = objectValue(step.settings);
  switch (step.stepType) {
    case "send_email":
      if (!step.subject || (!step.bodyHtml && !step.bodyText)) {
        throw new Error(`Email step ${step.id} has no publishable subject or body`);
      }
      return {
        ...common,
        type: "email" as const,
        config: {
          subject: step.subject,
          ...(step.bodyHtml ? { bodyHtml: step.bodyHtml } : {}),
          ...(step.bodyText ? { bodyText: step.bodyText } : {}),
          ...source,
        },
      };
    case "wait":
      return {
        ...common,
        type: "wait" as const,
        config: { amount: step.delayAmount, unit: step.delayUnit, ...source },
      };
    case "add_tag":
      return {
        ...common,
        type: "add_tag" as const,
        config: { tags: settings.tags, ...source },
      };
    case "update_contact_status":
      return {
        ...common,
        type: "contact_status" as const,
        config: { status: settings.status, ...source },
      };
    default:
      throw new Error(`Unsupported legacy step type: ${step.stepType}`);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function main() {
  const tenantId = flag("tenant-id");
  const flowIds = flag("flow-ids")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const apply = process.argv.includes("--apply");
  if (!tenantId) throw new Error("Missing required --tenant-id");
  if (!flowIds?.length) throw new Error("Missing required --flow-ids id1,id2");

  const flows = await db
    .select()
    .from(automationFlows)
    .where(and(eq(automationFlows.tenantId, tenantId), inArray(automationFlows.id, flowIds)));
  if (flows.length !== new Set(flowIds).size) {
    throw new Error("Every flow must exist and already belong to the selected tenant");
  }

  const preview = [];
  for (const flow of flows) {
    const steps = await db
      .select()
      .from(automationSteps)
      .where(eq(automationSteps.flowId, flow.id))
      .orderBy(asc(automationSteps.stepOrder));
    const graph = automationGraphSchema.parse({
      nodes: [
        {
          key: "trigger",
          type: "trigger",
          name: flow.name,
          position: { x: 80, y: 160 },
          config: {
            triggerType: flow.triggerType,
            filters: objectValue(flow.audienceFilter),
            legacyFlowId: flow.id,
          },
        },
        ...steps.map(convertStep),
      ],
      edges: steps.map((step, index) => ({
        id: `edge-${index + 1}`,
        source: index === 0 ? "trigger" : `step-${steps[index - 1]?.id}`,
        target: `step-${step.id}`,
        sourceHandle: "default",
        order: 0,
      })),
    });
    const nodes = graph.nodes.map((node) => ({
      nodeKey: node.key,
      nodeType: node.type,
      name: node.name,
      positionX: node.position.x,
      positionY: node.position.y,
      config: node.config,
    }));
    const edges = graph.edges.map((edge) => ({
      sourceNodeKey: edge.source,
      targetNodeKey: edge.target,
      sourceHandle: edge.sourceHandle,
      edgeOrder: edge.order,
    }));
    const graphHash = createHash("sha256").update(stableJson(graph)).digest("hex");
    preview.push({ flowId: flow.id, nodeCount: nodes.length, edgeCount: edges.length, graphHash });

    if (!apply) continue;
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: automationWorkflowRevisions.id,
          graphHash: automationWorkflowRevisions.graphHash,
        })
        .from(automationWorkflowRevisions)
        .where(
          and(
            eq(automationWorkflowRevisions.tenantId, tenantId),
            eq(automationWorkflowRevisions.flowId, flow.id),
            eq(automationWorkflowRevisions.lifecycle, "draft"),
          ),
        )
        .limit(1);
      if (existing?.graphHash === graphHash) return;
      if (existing) throw new Error(`Flow ${flow.id} already has a different draft`);

      const [latestRevision] = await tx
        .select({ version: automationWorkflowRevisions.version })
        .from(automationWorkflowRevisions)
        .where(eq(automationWorkflowRevisions.flowId, flow.id))
        .orderBy(desc(automationWorkflowRevisions.version))
        .limit(1);
      const [revision] = await tx
        .insert(automationWorkflowRevisions)
        .values({
          tenantId,
          flowId: flow.id,
          version: (latestRevision?.version ?? 0) + 1,
          lifecycle: "draft",
          graphHash,
        })
        .returning({ id: automationWorkflowRevisions.id });
      if (!revision) throw new Error(`Failed to create draft for flow ${flow.id}`);

      await tx
        .insert(automationWorkflowNodes)
        .values(nodes.map((node) => ({ ...node, tenantId, revisionId: revision.id })));
      if (edges.length) {
        await tx
          .insert(automationWorkflowEdges)
          .values(edges.map((edge) => ({ ...edge, tenantId, revisionId: revision.id })));
      }
      await tx
        .update(automationFlows)
        .set({ draftRevisionId: revision.id })
        .where(and(eq(automationFlows.id, flow.id), eq(automationFlows.tenantId, tenantId)));
    });
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", tenantId, preview }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Graph backfill failed");
    process.exitCode = 1;
  })
  .finally(closeWorkerDb);
