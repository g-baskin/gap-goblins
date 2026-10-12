import {
  Clock3,
  Code2,
  GitBranch,
  Mail,
  MessageSquareText,
  MoveRight,
  PhoneCall,
  Send,
  Tags,
  UserRoundCheck,
  Webhook,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AutomationGraphNode, GraphNodeType } from "@/lib/automation/graph/types";

export type NodeCatalogItem = {
  type: GraphNodeType;
  label: string;
  description: string;
  group: "Logic" | "Messages" | "CRM" | "Integrations";
  icon: ComponentType<{ className?: string }>;
};

export const nodeCatalog: NodeCatalogItem[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Start the workflow",
    group: "Logic",
    icon: Zap,
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch using contact data",
    group: "Logic",
    icon: GitBranch,
  },
  {
    type: "wait",
    label: "Wait",
    description: "Pause before continuing",
    group: "Logic",
    icon: Clock3,
  },
  {
    type: "email",
    label: "Email",
    description: "Send an email message",
    group: "Messages",
    icon: Mail,
  },
  {
    type: "sms",
    label: "SMS",
    description: "Send a consent-checked text",
    group: "Messages",
    icon: MessageSquareText,
  },
  { type: "add_tag", label: "Add tag", description: "Add CRM tags", group: "CRM", icon: Tags },
  {
    type: "contact_status",
    label: "Contact status",
    description: "Update lifecycle status",
    group: "CRM",
    icon: UserRoundCheck,
  },
  {
    type: "create_deal",
    label: "Create deal",
    description: "Create a pipeline deal",
    group: "CRM",
    icon: Send,
  },
  {
    type: "move_deal_stage",
    label: "Move deal",
    description: "Move a deal to a stage",
    group: "CRM",
    icon: MoveRight,
  },
  {
    type: "call_task",
    label: "Call task",
    description: "Assign a human follow-up",
    group: "CRM",
    icon: PhoneCall,
  },
  {
    type: "outbound_webhook",
    label: "Webhook",
    description: "Send a signed HTTPS request",
    group: "Integrations",
    icon: Webhook,
  },
  {
    type: "registered_custom_action",
    label: "Custom action",
    description: "Run reviewed server code",
    group: "Integrations",
    icon: Code2,
  },
];

export function createWorkflowNode(
  type: GraphNodeType,
  position: { x: number; y: number },
): AutomationGraphNode {
  const key = `${type}-${crypto.randomUUID()}`;
  const common = {
    key,
    name: nodeCatalog.find((item) => item.type === type)?.label ?? type,
    position,
  };
  switch (type) {
    case "trigger":
      return { ...common, type, config: { triggerType: "manual_enrollment", filters: {} } };
    case "condition":
      return {
        ...common,
        type,
        config: {
          expression: {
            kind: "rule",
            field: "contact.contactStatus",
            operator: "equals",
            value: "lead",
          },
        },
      };
    case "email":
      return { ...common, type, config: { subject: "Follow-up", bodyText: "Hi {{first_name}}," } };
    case "sms":
      return { ...common, type, config: { body: "Hi {{first_name}}", channelAccountId: "" } };
    case "wait":
      return { ...common, type, config: { amount: 1, unit: "days" } };
    case "add_tag":
      return { ...common, type, config: { tags: ["follow-up"] } };
    case "contact_status":
      return { ...common, type, config: { status: "qualified" } };
    case "create_deal":
      return { ...common, type, config: { pipelineId: "", stageId: "", name: "New deal" } };
    case "move_deal_stage":
      return { ...common, type, config: { stageId: "" } };
    case "call_task":
      return {
        ...common,
        type,
        config: { script: "Call the contact and record the outcome.", dueOffsetMinutes: 60 },
      };
    case "outbound_webhook":
      return {
        ...common,
        type,
        config: { url: "https://", headers: {}, body: {}, secretReference: "", timeoutMs: 10000 },
      };
    case "registered_custom_action":
      return {
        ...common,
        type,
        config: { actionId: "contact.timeline_note", version: 1, values: { note: "" } },
      };
  }
}
