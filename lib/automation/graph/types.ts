import type { z } from "zod";
import type {
  automationGraphNodeSchema,
  automationGraphSchema,
} from "@/lib/validations/automation-graph";

export const GRAPH_TRIGGER_TYPES = [
  "newsletter_subscriber_verified",
  "manual_enrollment",
  "contact_created",
  "contact_status_changed",
  "contact_tag_added",
  "booking_created",
  "deal_stage_changed",
  "signed_inbound_webhook",
] as const;

export const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "in",
  "exists",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;

export const GRAPH_NODE_TYPES = [
  "trigger",
  "condition",
  "email",
  "sms",
  "wait",
  "add_tag",
  "contact_status",
  "create_deal",
  "move_deal_stage",
  "call_task",
  "outbound_webhook",
  "registered_custom_action",
] as const;

export type AutomationGraph = z.infer<typeof automationGraphSchema>;
export type AutomationGraphNode = z.infer<typeof automationGraphNodeSchema>;
export type ConditionRule = {
  kind: "rule";
  field: string;
  operator: (typeof CONDITION_OPERATORS)[number];
  value?: unknown;
};
export type ConditionExpression =
  | ConditionRule
  | { kind: "group"; combinator: "and" | "or"; conditions: ConditionExpression[] };
export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];
export type GraphTriggerType = (typeof GRAPH_TRIGGER_TYPES)[number];
