"use client";

import { Copy, Trash2, X } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  type AutomationGraphNode,
  CONDITION_OPERATORS,
  GRAPH_TRIGGER_TYPES,
} from "@/lib/automation/graph/types";

export type PipelineOption = {
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
};
export type ActionDescriptor = {
  id: string;
  version: number;
  name: string;
  editorFields: Array<{
    name: string;
    label: string;
    type: "text" | "textarea" | "number" | "select";
    required?: boolean;
    optionsSource?: string;
  }>;
};

type Props = {
  node: AutomationGraphNode | null;
  pipelineOptions: PipelineOption[];
  actions: ActionDescriptor[];
  onChange: (node: AutomationGraphNode) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "url";
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function WorkflowInspector({
  node,
  pipelineOptions,
  actions,
  onChange,
  onDuplicate,
  onDelete,
  onClose,
}: Props) {
  if (!node)
    return (
      <aside className="hidden h-full border-l bg-card p-6 text-sm text-muted-foreground xl:block">
        Select a node to configure it.
      </aside>
    );
  const config = node.config as Record<string, unknown>;
  const patch = (values: Record<string, unknown>) =>
    onChange({ ...node, config: { ...config, ...values } } as AutomationGraphNode);
  const stages = pipelineOptions.filter(
    (option) => !config.pipelineId || option.pipelineId === config.pipelineId,
  );

  return (
    <aside
      className="h-full min-h-0 overflow-y-auto border-l bg-card"
      aria-label="Selected node settings"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-3">
        <h2 className="text-sm font-semibold">Step settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close settings">
          <X className="size-4" />
        </Button>
      </div>
      <div className="space-y-4 p-4">
        <Field
          label="Step name"
          value={node.name}
          onChange={(name) => onChange({ ...node, name })}
        />
        {node.type === "trigger" && (
          <SelectField
            label="Trigger"
            value={String(config.triggerType)}
            options={GRAPH_TRIGGER_TYPES.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(triggerType) => patch({ triggerType })}
          />
        )}
        {node.type === "condition" && <ConditionEditor config={config} onChange={patch} />}
        {node.type === "email" && (
          <>
            <Field
              label="Subject"
              value={String(config.subject ?? "")}
              onChange={(subject) => patch({ subject })}
            />
            <TextField
              label="Message"
              value={String(config.bodyText ?? "")}
              onChange={(bodyText) => patch({ bodyText })}
            />
          </>
        )}
        {node.type === "sms" && (
          <>
            <TextField
              label="Text message"
              value={String(config.body ?? "")}
              onChange={(body) => patch({ body })}
            />
            <Field
              label="SMS channel account ID"
              value={String(config.channelAccountId ?? "")}
              onChange={(channelAccountId) => patch({ channelAccountId })}
            />
          </>
        )}
        {node.type === "wait" && (
          <>
            <Field
              label="Amount"
              type="number"
              value={Number(config.amount ?? 1)}
              onChange={(value) => patch({ amount: Number(value) })}
            />
            <SelectField
              label="Unit"
              value={String(config.unit)}
              options={["minutes", "hours", "days"].map((value) => ({ value, label: value }))}
              onChange={(unit) => patch({ unit })}
            />
          </>
        )}
        {node.type === "add_tag" && (
          <Field
            label="Tags (comma-separated)"
            value={(config.tags as string[] | undefined)?.join(", ") ?? ""}
            onChange={(value) =>
              patch({
                tags: value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
        )}
        {node.type === "contact_status" && (
          <SelectField
            label="Status"
            value={String(config.status)}
            options={["subscriber", "lead", "qualified", "customer"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(status) => patch({ status })}
          />
        )}
        {node.type === "create_deal" && (
          <>
            <PipelineFields
              config={config}
              options={pipelineOptions}
              stages={stages}
              patch={patch}
            />
            <Field
              label="Deal name"
              value={String(config.name ?? "")}
              onChange={(name) => patch({ name })}
            />
            <Field
              label="Amount"
              type="number"
              value={Number(config.amount ?? 0)}
              onChange={(value) => patch({ amount: Number(value) })}
            />
          </>
        )}
        {node.type === "move_deal_stage" && (
          <>
            <SelectField
              label="Stage"
              value={String(config.stageId ?? "")}
              options={pipelineOptions.map((option) => ({
                value: option.stageId,
                label: `${option.pipelineName} / ${option.stageName}`,
              }))}
              onChange={(stageId) => patch({ stageId })}
            />
            <Field
              label="Deal ID (optional)"
              value={String(config.dealId ?? "")}
              onChange={(dealId) => patch({ dealId: dealId || undefined })}
            />
          </>
        )}
        {node.type === "call_task" && (
          <>
            <TextField
              label="Call script"
              value={String(config.script ?? "")}
              onChange={(script) => patch({ script })}
            />
            <Field
              label="Due in minutes"
              type="number"
              value={Number(config.dueOffsetMinutes ?? 60)}
              onChange={(value) => patch({ dueOffsetMinutes: Number(value) })}
            />
            <Field
              label="Assignee user ID (optional)"
              value={String(config.assignedToUserId ?? "")}
              onChange={(assignedToUserId) =>
                patch({ assignedToUserId: assignedToUserId || undefined })
              }
            />
          </>
        )}
        {node.type === "outbound_webhook" && (
          <>
            <Field
              label="HTTPS URL"
              type="url"
              value={String(config.url ?? "")}
              onChange={(url) => patch({ url })}
            />
            <Field
              label="Secret reference"
              value={String(config.secretReference ?? "")}
              onChange={(secretReference) => patch({ secretReference })}
            />
            <Field
              label="Timeout (milliseconds)"
              type="number"
              value={Number(config.timeoutMs ?? 10000)}
              onChange={(value) => patch({ timeoutMs: Number(value) })}
            />
          </>
        )}
        {node.type === "registered_custom_action" && (
          <CustomActionEditor config={config} actions={actions} patch={patch} />
        )}
        <div className="flex gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onDuplicate}>
            <Copy className="size-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDelete}
            disabled={node.type === "trigger"}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28"
      />
    </div>
  );
}

function ConditionEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const expression = config.expression as
    | { kind?: string; field?: string; operator?: string; value?: unknown }
    | undefined;
  if (expression?.kind !== "rule")
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        Nested condition groups are preserved. Replace them with one rule to edit here.
      </div>
    );
  const update = (patch: Record<string, unknown>) =>
    onChange({ expression: { ...expression, ...patch } });
  return (
    <>
      <Field
        label="Contact or event field"
        value={expression.field ?? ""}
        onChange={(field) => update({ field })}
      />
      <SelectField
        label="Operator"
        value={expression.operator ?? "equals"}
        options={CONDITION_OPERATORS.map((value) => ({ value, label: value.replaceAll("_", " ") }))}
        onChange={(operator) => update({ operator })}
      />
      {expression.operator !== "exists" && (
        <Field
          label="Compare with"
          value={String(expression.value ?? "")}
          onChange={(value) => update({ value })}
        />
      )}
    </>
  );
}

function PipelineFields({
  config,
  options,
  stages,
  patch,
}: {
  config: Record<string, unknown>;
  options: PipelineOption[];
  stages: PipelineOption[];
  patch: (value: Record<string, unknown>) => void;
}) {
  const pipelines = Array.from(
    new Map(options.map((option) => [option.pipelineId, option.pipelineName])),
  );
  return (
    <>
      <SelectField
        label="Pipeline"
        value={String(config.pipelineId ?? "")}
        options={pipelines.map(([value, label]) => ({ value, label }))}
        onChange={(pipelineId) => patch({ pipelineId, stageId: "" })}
      />
      <SelectField
        label="Stage"
        value={String(config.stageId ?? "")}
        options={stages.map((option) => ({ value: option.stageId, label: option.stageName }))}
        onChange={(stageId) => patch({ stageId })}
      />
    </>
  );
}

function CustomActionEditor({
  config,
  actions,
  patch,
}: {
  config: Record<string, unknown>;
  actions: ActionDescriptor[];
  patch: (value: Record<string, unknown>) => void;
}) {
  const action =
    actions.find((item) => item.id === config.actionId && item.version === config.version) ??
    actions[0];
  const values = (config.values as Record<string, unknown> | undefined) ?? {};
  return (
    <>
      <SelectField
        label="Registered action"
        value={action ? `${action.id}:${action.version}` : ""}
        options={actions.map((item) => ({ value: `${item.id}:${item.version}`, label: item.name }))}
        onChange={(value) => {
          const next = actions.find((item) => `${item.id}:${item.version}` === value);
          if (next) patch({ actionId: next.id, version: next.version, values: {} });
        }}
      />
      {action?.editorFields.map((field) =>
        field.type === "textarea" ? (
          <TextField
            key={field.name}
            label={field.label}
            value={String(values[field.name] ?? "")}
            onChange={(value) => patch({ values: { ...values, [field.name]: value } })}
          />
        ) : (
          <Field
            key={field.name}
            label={field.label}
            type={field.type === "number" ? "number" : "text"}
            value={String(values[field.name] ?? "")}
            onChange={(value) =>
              patch({
                values: {
                  ...values,
                  [field.name]: field.type === "number" ? Number(value) : value,
                },
              })
            }
          />
        ),
      )}
    </>
  );
}
