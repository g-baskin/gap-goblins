import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, max, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  automationFlows,
  automationWorkflowEdges,
  automationWorkflowNodes,
  automationWorkflowRevisions,
  automationWorkflowTemplates,
} from "@/lib/db/schema";
import { automationGraphSchema } from "@/lib/validations/automation-graph";
import { compileAutomationGraph, hashAutomationGraph } from "./compiler";
import type { AutomationGraph } from "./types";

const ZERO = "00000000-0000-4000-8000-000000000000";
type TemplateNodeKey = string;
const node = (
  key: TemplateNodeKey,
  type: string,
  config: Record<string, unknown>,
  x: number,
  y = 100,
) => ({
  key,
  name: key.replaceAll("_", " "),
  type,
  position: { x, y },
  config,
});
const edge = (id: string, source: string, target: string, sourceHandle = "default") => ({
  id,
  source,
  target,
  sourceHandle,
  order: 0,
});

export const systemWorkflowTemplates: Array<{
  id: string;
  name: string;
  category: string;
  version: number;
  graph: AutomationGraph;
}> = [
  {
    id: "new-lead-fallback",
    name: "New lead SMS/email fallback",
    category: "lead-nurture",
    version: 1,
    graph: automationGraphSchema.parse({
      nodes: [
        node(
          "trigger",
          "trigger",
          { triggerType: "contact_status_changed", filters: { status: "lead" } },
          0,
        ),
        node(
          "consent",
          "condition",
          {
            expression: {
              kind: "rule",
              field: "contact.smsConsent",
              operator: "equals",
              value: true,
            },
          },
          250,
        ),
        node(
          "sms",
          "sms",
          { body: "Thanks for getting in touch.", channelAccountId: ZERO },
          500,
          20,
        ),
        node(
          "email",
          "email",
          { subject: "Thanks for getting in touch", bodyText: "We'll follow up shortly." },
          500,
          180,
        ),
      ],
      edges: [
        edge("e1", "trigger", "consent"),
        edge("e2", "consent", "sms", "true"),
        edge("e3", "consent", "email", "false"),
      ],
    }),
  },
  {
    id: "booking-call-task",
    name: "Booking confirmation and call task",
    category: "booking",
    version: 1,
    graph: automationGraphSchema.parse({
      nodes: [
        node(
          "trigger",
          "trigger",
          { triggerType: "deal_stage_changed", filters: { stage: "meeting-booked" } },
          0,
        ),
        node(
          "email",
          "email",
          { subject: "Booking confirmed", bodyText: "Your booking is confirmed." },
          250,
        ),
        node(
          "call",
          "call_task",
          { script: "Confirm requirements and next steps.", dueOffsetMinutes: 1440 },
          500,
        ),
      ],
      edges: [edge("e1", "trigger", "email"), edge("e2", "email", "call")],
    }),
  },
  {
    id: "deal-stage-follow-up",
    name: "Deal follow-up and pipeline move",
    category: "pipeline",
    version: 1,
    graph: automationGraphSchema.parse({
      nodes: [
        node("trigger", "trigger", { triggerType: "deal_stage_changed", filters: {} }, 0),
        node("wait", "wait", { amount: 1, unit: "days" }, 250),
        node("move", "move_deal_stage", { stageId: ZERO }, 500),
      ],
      edges: [edge("e1", "trigger", "wait"), edge("e2", "wait", "move")],
    }),
  },
  {
    id: "signed-webhook-action",
    name: "Signed webhook to registered action",
    category: "integration",
    version: 1,
    graph: automationGraphSchema.parse({
      nodes: [
        node("trigger", "trigger", { triggerType: "signed_inbound_webhook", filters: {} }, 0),
        node(
          "condition",
          "condition",
          {
            expression: { kind: "rule", field: "event.approved", operator: "equals", value: true },
          },
          250,
        ),
        node(
          "note",
          "registered_custom_action",
          { actionId: "contact.timeline_note", version: 1, values: { note: "Webhook approved" } },
          500,
          20,
        ),
        node(
          "webhook",
          "outbound_webhook",
          {
            url: "https://example.com/webhook",
            headers: {},
            body: {},
            secretReference: "env:OUTBOUND_WEBHOOK_SECRET",
            timeoutMs: 10000,
          },
          500,
          180,
        ),
      ],
      edges: [
        edge("e1", "trigger", "condition"),
        edge("e2", "condition", "note", "true"),
        edge("e3", "condition", "webhook", "false"),
      ],
    }),
  },
];

for (const template of systemWorkflowTemplates) compileAutomationGraph(template.graph);

export async function listWorkflowTemplates(tenantId: string) {
  const stored = await db
    .select()
    .from(automationWorkflowTemplates)
    .where(
      and(
        isNull(automationWorkflowTemplates.archivedAt),
        or(
          and(
            eq(automationWorkflowTemplates.scope, "system"),
            isNull(automationWorkflowTemplates.tenantId),
          ),
          and(
            eq(automationWorkflowTemplates.scope, "tenant"),
            eq(automationWorkflowTemplates.tenantId, tenantId),
          ),
        ),
      ),
    )
    .orderBy(desc(automationWorkflowTemplates.createdAt));
  return [
    ...systemWorkflowTemplates.map((template) => ({ ...template, scope: "system" })),
    ...stored,
  ];
}

function freshGraph(graph: AutomationGraph): AutomationGraph {
  const keys = new Map(graph.nodes.map((item) => [item.key, randomUUID()]));
  return automationGraphSchema.parse({
    nodes: graph.nodes.map((item) => ({ ...item, key: keys.get(item.key) ?? item.key })),
    edges: graph.edges.map((item) => ({
      ...item,
      id: randomUUID(),
      source: keys.get(item.source),
      target: keys.get(item.target),
    })),
  });
}

export async function applyWorkflowTemplate(input: {
  tenantId: string;
  flowId: string;
  templateId: string;
  userId: string;
}) {
  const system = systemWorkflowTemplates.find((template) => template.id === input.templateId);
  const stored = system
    ? null
    : await db
        .select()
        .from(automationWorkflowTemplates)
        .where(
          and(
            eq(automationWorkflowTemplates.id, input.templateId),
            isNull(automationWorkflowTemplates.archivedAt),
            or(
              and(
                eq(automationWorkflowTemplates.scope, "system"),
                isNull(automationWorkflowTemplates.tenantId),
              ),
              and(
                eq(automationWorkflowTemplates.scope, "tenant"),
                eq(automationWorkflowTemplates.tenantId, input.tenantId),
              ),
            ),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);
  const source = system?.graph ?? stored?.graphSnapshot;
  if (!source) throw new Error("Workflow template not found");
  const graph = freshGraph(automationGraphSchema.parse(source));

  return db.transaction(async (tx) => {
    const [flow] = await tx
      .select({ id: automationFlows.id, draftRevisionId: automationFlows.draftRevisionId })
      .from(automationFlows)
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      )
      .limit(1);
    if (!flow) throw new Error("Workflow not found in tenant");
    if (flow.draftRevisionId) throw new Error("Workflow already has a draft");
    const [{ latestVersion }] = await tx
      .select({ latestVersion: max(automationWorkflowRevisions.version) })
      .from(automationWorkflowRevisions)
      .where(
        and(
          eq(automationWorkflowRevisions.flowId, input.flowId),
          eq(automationWorkflowRevisions.tenantId, input.tenantId),
        ),
      );
    const [revision] = await tx
      .insert(automationWorkflowRevisions)
      .values({
        tenantId: input.tenantId,
        flowId: input.flowId,
        version: (latestVersion ?? 0) + 1,
        lifecycle: "draft",
        graphHash: hashAutomationGraph(graph),
        authorId: input.userId,
      })
      .returning({ id: automationWorkflowRevisions.id });
    if (!revision) throw new Error("Template draft was not created");
    await tx.insert(automationWorkflowNodes).values(
      graph.nodes.map((item) => ({
        tenantId: input.tenantId,
        revisionId: revision.id,
        nodeKey: item.key,
        nodeType: item.type,
        name: item.name,
        positionX: item.position.x,
        positionY: item.position.y,
        config: item.config,
      })),
    );
    await tx.insert(automationWorkflowEdges).values(
      graph.edges.map((item) => ({
        tenantId: input.tenantId,
        revisionId: revision.id,
        sourceNodeKey: item.source,
        targetNodeKey: item.target,
        sourceHandle: item.sourceHandle,
        edgeOrder: item.order,
      })),
    );
    await tx
      .update(automationFlows)
      .set({ draftRevisionId: revision.id, updatedAt: new Date().toISOString() })
      .where(
        and(eq(automationFlows.id, input.flowId), eq(automationFlows.tenantId, input.tenantId)),
      );
    return { revisionId: revision.id, graph };
  });
}
