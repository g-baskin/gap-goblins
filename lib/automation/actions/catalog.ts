export type ActionSideEffect = "database" | "external" | "human_wait";
export type ActionEditorField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  required?: boolean;
  optionsSource?: "contact_fields" | "pipelines" | "stages" | "admin_users";
};

export type RegisteredActionDescriptor = {
  id: string;
  version: number;
  name: string;
  description: string;
  sideEffect: ActionSideEffect;
  retryPolicy: "none" | "bounded";
  requiredCapabilities: string[];
  editorFields: ActionEditorField[];
};

export const registeredActionCatalog: RegisteredActionDescriptor[] = [
  {
    id: "contact.timeline_note",
    version: 1,
    name: "Append timeline note",
    description: "Add an internal note to the enrolled contact timeline.",
    sideEffect: "database",
    retryPolicy: "none",
    requiredCapabilities: ["contacts:write"],
    editorFields: [{ name: "note", label: "Note", type: "textarea", required: true }],
  },
  {
    id: "contact.set_field",
    version: 1,
    name: "Set contact field",
    description: "Set one reviewed editable contact field.",
    sideEffect: "database",
    retryPolicy: "none",
    requiredCapabilities: ["contacts:write"],
    editorFields: [
      {
        name: "field",
        label: "Contact field",
        type: "select",
        required: true,
        optionsSource: "contact_fields",
      },
      { name: "value", label: "Value", type: "text", required: true },
    ],
  },
  {
    id: "pipeline.create_deal",
    version: 1,
    name: "Create pipeline deal",
    description: "Create one deal for the enrolled contact.",
    sideEffect: "database",
    retryPolicy: "none",
    requiredCapabilities: ["deals:write"],
    editorFields: [
      {
        name: "pipelineId",
        label: "Pipeline",
        type: "select",
        required: true,
        optionsSource: "pipelines",
      },
      { name: "stageId", label: "Stage", type: "select", required: true, optionsSource: "stages" },
      { name: "name", label: "Deal name", type: "text", required: true },
      { name: "amount", label: "Amount", type: "number" },
    ],
  },
  {
    id: "pipeline.move_deal",
    version: 1,
    name: "Move pipeline deal",
    description: "Move an enrolled or selected deal to another stage.",
    sideEffect: "database",
    retryPolicy: "none",
    requiredCapabilities: ["deals:write"],
    editorFields: [
      { name: "dealId", label: "Deal ID", type: "text" },
      { name: "stageId", label: "Stage", type: "select", required: true, optionsSource: "stages" },
    ],
  },
  {
    id: "call_task.create",
    version: 1,
    name: "Create human call task",
    description: "Pause until an assigned person records the call outcome.",
    sideEffect: "human_wait",
    retryPolicy: "none",
    requiredCapabilities: ["call_tasks:write"],
    editorFields: [
      { name: "script", label: "Call script", type: "textarea", required: true },
      { name: "dueOffsetMinutes", label: "Due in minutes", type: "number", required: true },
      {
        name: "assignedToUserId",
        label: "Assignee",
        type: "select",
        optionsSource: "admin_users",
      },
    ],
  },
];

export function hasRegisteredAction(id: string, version: number): boolean {
  return registeredActionCatalog.some((action) => action.id === id && action.version === version);
}
