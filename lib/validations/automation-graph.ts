import { z } from "zod";
import type { ConditionExpression } from "@/lib/automation/graph/types";
import { CONDITION_OPERATORS, GRAPH_TRIGGER_TYPES } from "@/lib/automation/graph/types";

const nodeKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const uuidSchema = z.uuid();
const positionSchema = z.object({ x: z.number().int(), y: z.number().int() }).strict();
const headersSchema = z.record(z.string().max(100), z.string().max(2000)).default({});

const conditionLeafSchema = z
  .object({
    kind: z.literal("rule"),
    field: z.string().trim().min(1).max(200),
    operator: z.enum(CONDITION_OPERATORS),
    value: z.unknown().optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    if (rule.operator !== "exists" && rule.value === undefined) {
      context.addIssue({ code: "custom", path: ["value"], message: "Value is required" });
    }
  });

export const conditionExpressionSchema: z.ZodType<ConditionExpression> = z.lazy(() =>
  z.union([
    conditionLeafSchema,
    z
      .object({
        kind: z.literal("group"),
        combinator: z.enum(["and", "or"]),
        conditions: z.array(conditionExpressionSchema).min(1).max(20),
      })
      .strict(),
  ]),
);

const nodeBase = {
  key: nodeKeySchema,
  name: z.string().trim().min(1).max(160),
  position: positionSchema,
};

const triggerNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("trigger"),
    config: z
      .object({
        triggerType: z.enum(GRAPH_TRIGGER_TYPES),
        filters: z.record(z.string(), z.unknown()).default({}),
        endpointId: uuidSchema.optional(),
        legacyFlowId: uuidSchema.optional(),
      })
      .strict(),
  })
  .strict();
const conditionNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("condition"),
    config: z.object({ expression: conditionExpressionSchema }).strict(),
  })
  .strict();
const emailNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("email"),
    config: z
      .object({
        subject: z.string().trim().min(1).max(240),
        bodyHtml: z.string().max(500_000).optional(),
        bodyText: z.string().max(200_000).optional(),
        legacyStepId: uuidSchema.optional(),
        legacyStepOrder: z.number().int().positive().optional(),
      })
      .strict()
      .refine((value) => value.bodyHtml || value.bodyText, "Email body is required"),
  })
  .strict();
const smsNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("sms"),
    config: z
      .object({ body: z.string().trim().min(1).max(1600), channelAccountId: uuidSchema })
      .strict(),
  })
  .strict();
const waitNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("wait"),
    config: z
      .object({
        amount: z.number().int().min(0).max(365),
        unit: z.enum(["minutes", "hours", "days"]),
        legacyStepId: uuidSchema.optional(),
        legacyStepOrder: z.number().int().positive().optional(),
      })
      .strict(),
  })
  .strict();
const addTagNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("add_tag"),
    config: z
      .object({
        tags: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
        legacyStepId: uuidSchema.optional(),
        legacyStepOrder: z.number().int().positive().optional(),
      })
      .strict(),
  })
  .strict();
const contactStatusNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("contact_status"),
    config: z
      .object({
        status: z.string().trim().min(1).max(80),
        legacyStepId: uuidSchema.optional(),
        legacyStepOrder: z.number().int().positive().optional(),
      })
      .strict(),
  })
  .strict();
const createDealNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("create_deal"),
    config: z
      .object({
        pipelineId: uuidSchema,
        stageId: uuidSchema,
        name: z.string().trim().min(1).max(200),
        amount: z.number().nonnegative().max(1_000_000_000).optional(),
      })
      .strict(),
  })
  .strict();
const moveDealStageNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("move_deal_stage"),
    config: z.object({ dealId: uuidSchema.optional(), stageId: uuidSchema }).strict(),
  })
  .strict();
const callTaskNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("call_task"),
    config: z
      .object({
        script: z.string().trim().min(1).max(10_000),
        dueOffsetMinutes: z.number().int().min(0).max(525_600),
        assignedToUserId: uuidSchema.optional(),
        dealId: uuidSchema.optional(),
      })
      .strict(),
  })
  .strict();
const outboundWebhookNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("outbound_webhook"),
    config: z
      .object({
        url: z.url().max(2048),
        headers: headersSchema,
        body: z.record(z.string(), z.unknown()).default({}),
        secretReference: z.string().trim().min(1).max(500),
        timeoutMs: z.number().int().min(100).max(30_000).default(10_000),
      })
      .strict(),
  })
  .strict();
const customActionNodeSchema = z
  .object({
    ...nodeBase,
    type: z.literal("registered_custom_action"),
    config: z
      .object({
        actionId: z.string().trim().min(1).max(120),
        version: z.number().int().positive(),
        values: z.record(z.string(), z.unknown()).default({}),
      })
      .strict(),
  })
  .strict();

export const automationGraphNodeSchema = z.discriminatedUnion("type", [
  triggerNodeSchema,
  conditionNodeSchema,
  emailNodeSchema,
  smsNodeSchema,
  waitNodeSchema,
  addTagNodeSchema,
  contactStatusNodeSchema,
  createDealNodeSchema,
  moveDealStageNodeSchema,
  callTaskNodeSchema,
  outboundWebhookNodeSchema,
  customActionNodeSchema,
]);

export const automationGraphEdgeSchema = z
  .object({
    id: nodeKeySchema,
    source: nodeKeySchema,
    target: nodeKeySchema,
    sourceHandle: z.string().trim().min(1).max(40).default("default"),
    order: z.number().int().min(0).max(200).default(0),
    label: z.string().trim().max(100).optional(),
  })
  .strict()
  .refine((edge) => edge.source !== edge.target, "Self edges are not allowed");

export const automationGraphSchema = z
  .object({
    nodes: z.array(automationGraphNodeSchema).min(1).max(100),
    edges: z.array(automationGraphEdgeSchema).max(200),
  })
  .strict();

export const saveAutomationGraphSchema = z
  .object({
    graph: automationGraphSchema,
    optimisticToken: uuidSchema.optional(),
  })
  .strict();
