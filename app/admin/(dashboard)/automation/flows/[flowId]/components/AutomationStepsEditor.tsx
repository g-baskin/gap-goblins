"use client";

import { Mail, Plus, Tag, Trash2, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
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
import type { AutomationStep } from "../page";

type EditableStep = Omit<AutomationStep, "id"> & { id?: string; clientKey: string };

type ActionSettings = {
  tags?: string[];
  status?: string;
};

export function AutomationStepsEditor({
  flowId,
  tenantId,
  initialSteps,
  onSaved,
}: {
  flowId: string;
  tenantId: string;
  initialSteps: AutomationStep[];
  onSaved: () => void;
}) {
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    initialSteps.length > 0
      ? initialSteps.map((step) => ({ ...step, clientKey: step.id }))
      : createStarterSteps(),
  );
  const [saving, setSaving] = useState(false);

  function updateStep(index: number, patch: Partial<EditableStep>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function removeStep(index: number) {
    setSteps((current) => renumber(current.filter((_, i) => i !== index)));
  }

  function addEmailStep() {
    addStep({
      stepType: "send_email",
      name: "Follow-up email",
      subject: "A quick follow-up, {{first_name}}",
      bodyHtml:
        '<p>Hi {{first_name}},</p><p>Here is another useful resource.</p><p><a href="__YOUR_CAL_LINK__">Book a time</a></p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
      bodyText:
        "Hi {{first_name}},\n\nHere is another useful resource.\n\nBook a time: __YOUR_CAL_LINK__\n\nUnsubscribe: {{unsubscribe_url}}",
      delayAmount: 2,
      delayUnit: "days",
      settings: {},
    });
  }

  function addWaitStep() {
    addStep({
      stepType: "wait",
      name: "Wait",
      subject: null,
      bodyHtml: null,
      bodyText: null,
      delayAmount: 1,
      delayUnit: "days",
      settings: {},
    });
  }

  function addTagStep() {
    addStep({
      stepType: "add_tag",
      name: "Add CRM tag",
      subject: null,
      bodyHtml: null,
      bodyText: null,
      delayAmount: 0,
      delayUnit: "minutes",
      settings: { tags: ["vip"] },
    });
  }

  function addStatusStep() {
    addStep({
      stepType: "update_contact_status",
      name: "Update contact status",
      subject: null,
      bodyHtml: null,
      bodyText: null,
      delayAmount: 0,
      delayUnit: "minutes",
      settings: { status: "qualified" },
    });
  }

  function addStep(step: Omit<EditableStep, "clientKey" | "stepOrder">) {
    setSteps((current) => [
      ...current,
      {
        ...step,
        clientKey: createClientKey(),
        stepOrder: current.length + 1,
      },
    ]);
  }

  async function saveSteps() {
    setSaving(true);
    try {
      const response = await fetch(`/api/automation/flows/${flowId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          steps: renumber(steps).map(({ clientKey: _clientKey, ...step }) => step),
        }),
      });
      if (!response.ok) {
        toast.error("Failed to save steps");
        return;
      }
      toast.success("Steps saved");
      onSaved();
    } catch {
      toast.error("Failed to save steps");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Linear steps</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addWaitStep}>
            <Plus className="size-4" />
            Wait
          </Button>
          <Button variant="outline" size="sm" onClick={addTagStep}>
            <Tag className="size-4" />
            Tag
          </Button>
          <Button variant="outline" size="sm" onClick={addStatusStep}>
            <UserRoundCheck className="size-4" />
            Status
          </Button>
          <Button variant="outline" size="sm" onClick={addEmailStep}>
            <Plus className="size-4" />
            Email
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.clientKey} className="rounded-xl border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Step {index + 1}</Badge>
                <Badge variant={step.stepType === "send_email" ? "default" : "secondary"}>
                  {getStepTypeLabel(step.stepType)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_160px_140px]">
              <div className="space-y-2">
                <Label>Step name</Label>
                <Input
                  value={step.name}
                  onChange={(event) => updateStep(index, { name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Delay</Label>
                <Input
                  type="number"
                  min={0}
                  value={step.delayAmount}
                  onChange={(event) =>
                    updateStep(index, { delayAmount: Number(event.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={step.delayUnit}
                  onValueChange={(delayUnit: "minutes" | "hours" | "days") =>
                    updateStep(index, { delayUnit })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {step.stepType === "add_tag" && (
              <ActionSettingsEditor
                label="Tags to add"
                helper="Comma-separated CRM tags. Existing tags are left unchanged."
                value={formatList(getActionSettings(step.settings).tags)}
                placeholder="vip, proposal-ready"
                onChange={(value) =>
                  updateStep(index, {
                    settings: { tags: parseList(value) },
                  })
                }
              />
            )}

            {step.stepType === "update_contact_status" && (
              <div className="mt-4 space-y-2">
                <Label>Status to set</Label>
                <Select
                  value={getActionSettings(step.settings).status ?? "qualified"}
                  onValueChange={(status) => updateStep(index, { settings: { status } })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscriber">Subscriber</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  The worker blocks downgrades, so customer contacts will not be moved back to lead.
                </p>
              </div>
            )}

            {step.stepType === "send_email" && (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="size-4" /> Subject
                  </Label>
                  <Input
                    value={step.subject ?? ""}
                    onChange={(event) => updateStep(index, { subject: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HTML body</Label>
                  <Textarea
                    className="min-h-40 font-mono text-xs"
                    value={step.bodyHtml ?? ""}
                    onChange={(event) => updateStep(index, { bodyHtml: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Text body</Label>
                  <Textarea
                    className="min-h-32 font-mono text-xs"
                    value={step.bodyText ?? ""}
                    onChange={(event) => updateStep(index, { bodyText: event.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={saveSteps} disabled={saving}>
            {saving ? "Saving..." : "Save steps"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function renumber(steps: EditableStep[]): EditableStep[] {
  return steps.map((step, index) => ({ ...step, stepOrder: index + 1 }));
}

function createStarterSteps(): EditableStep[] {
  return [
    {
      clientKey: createClientKey(),
      stepOrder: 1,
      stepType: "send_email",
      name: "Welcome email",
      subject: "Welcome, {{first_name}}",
      bodyHtml:
        '<p>Hi {{first_name}},</p><p>Thanks for joining the newsletter. You will get practical systems ideas and examples from us.</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
      bodyText:
        "Hi {{first_name}},\n\nThanks for joining the newsletter. You will get practical systems ideas and examples from us.\n\nUnsubscribe: {{unsubscribe_url}}",
      delayAmount: 0,
      delayUnit: "minutes",
      settings: {},
    },
    {
      clientKey: createClientKey(),
      stepOrder: 2,
      stepType: "send_email",
      name: "Value email",
      subject: "A useful system to copy",
      bodyHtml:
        '<p>Hi {{first_name}},</p><p>Here is a useful system to think about for {{company}}.</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
      bodyText:
        "Hi {{first_name}},\n\nHere is a useful system to think about for {{company}}.\n\nUnsubscribe: {{unsubscribe_url}}",
      delayAmount: 2,
      delayUnit: "days",
      settings: {},
    },
    {
      clientKey: createClientKey(),
      stepOrder: 3,
      stepType: "send_email",
      name: "Soft booking CTA",
      subject: "Worth a short chat?",
      bodyHtml:
        '<p>Hi {{first_name}},</p><p>If you want to map a tailored system for {{company}}, book a time here: <a href="__YOUR_CAL_LINK__">__YOUR_CAL_LINK__</a>.</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
      bodyText:
        "Hi {{first_name}},\n\nIf you want to map a tailored system for {{company}}, book a time here: __YOUR_CAL_LINK__\n\nUnsubscribe: {{unsubscribe_url}}",
      delayAmount: 7,
      delayUnit: "days",
      settings: {},
    },
  ];
}

function ActionSettingsEditor({
  label,
  helper,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-muted-foreground text-xs">{helper}</p>
    </div>
  );
}

function getStepTypeLabel(stepType: AutomationStep["stepType"]): string {
  if (stepType === "send_email") return "Send email";
  if (stepType === "add_tag") return "Add tag";
  if (stepType === "update_contact_status") return "Update status";
  return "Wait";
}

function getActionSettings(value: unknown): ActionSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const settings = value as ActionSettings;
  return {
    tags: Array.isArray(settings.tags) ? settings.tags : [],
    status: typeof settings.status === "string" ? settings.status : undefined,
  };
}

function parseList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function formatList(value: string[] | undefined): string {
  return value?.join(", ") ?? "";
}

function createClientKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}-${Math.random()}`;
}
