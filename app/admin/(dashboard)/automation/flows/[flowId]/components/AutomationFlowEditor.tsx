"use client";

import { useMemo, useState } from "react";
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
import { Switch } from "@/components/shadcn/ui/switch";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { AUTOMATION_TRIGGER_OPTIONS, type AutomationTriggerType } from "@/lib/automation/types";
import type { AutomationFlow } from "../page";

type AudienceFilter = {
  statuses?: string[];
  tags?: string[];
  stageSlugs?: string[];
};

const FILTER_PLACEHOLDERS: Partial<Record<AutomationTriggerType, string>> = {
  contact_status_changed: "qualified, customer",
  contact_tag_added: "vip, proposal-ready",
  deal_stage_changed: "meeting-booked, proposal-sent",
};

export function AutomationFlowEditor({
  flow,
  tenantId,
  onSaved,
}: {
  flow: AutomationFlow;
  tenantId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: flow.name,
    description: flow.description ?? "",
    triggerType: flow.triggerType,
    audienceFilter: parseAudienceFilter(flow.audienceFilter),
    fromName: flow.fromName ?? "",
    fromEmail: flow.fromEmail ?? "",
    replyTo: flow.replyTo ?? "",
    trackOpens: flow.trackOpens,
    trackClicks: flow.trackClicks,
    stopOnUnsubscribe: flow.stopOnUnsubscribe,
    stopOnBounce: flow.stopOnBounce,
    stopOnComplaint: flow.stopOnComplaint,
  });
  const [saving, setSaving] = useState(false);
  const selectedTriggerOption = useMemo(
    () => AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === form.triggerType),
    [form.triggerType],
  );

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/automation/flows/${flow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          ...form,
          audienceFilter: normalizeAudienceFilter(form.triggerType, form.audienceFilter),
        }),
      });
      if (!response.ok) {
        toast.error("Failed to save flow");
        return;
      }
      toast.success("Flow saved");
      onSaved();
    } catch {
      toast.error("Failed to save flow");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(action: "activate" | "pause") {
    const response = await fetch(`/api/automation/flows/${flow.id}/${action}`, {
      method: "POST",
      headers: { "x-tenant-id": tenantId },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error || `Failed to ${action} flow`);
      return;
    }
    toast.success(action === "activate" ? "Flow activated" : "Flow paused");
    onSaved();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Flow settings</CardTitle>
        <Badge variant={flow.status === "active" ? "default" : "secondary"}>{flow.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Trigger</Label>
          <Select
            value={form.triggerType}
            onValueChange={(triggerType) =>
              setForm({
                ...form,
                triggerType,
                audienceFilter: resetAudienceFilter(triggerType, form.audienceFilter),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_TRIGGER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTriggerOption?.description ? (
            <p className="text-muted-foreground text-sm">{selectedTriggerOption.description}</p>
          ) : null}
        </div>

        <TriggerFilterEditor
          triggerType={form.triggerType}
          audienceFilter={form.audienceFilter}
          onChange={(audienceFilter) => setForm({ ...form, audienceFilter })}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From name</Label>
            <Input
              value={form.fromName}
              onChange={(event) => setForm({ ...form, fromName: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>From email</Label>
            <Input
              value={form.fromEmail}
              onChange={(event) => setForm({ ...form, fromEmail: event.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reply-to</Label>
          <Input
            value={form.replyTo}
            onChange={(event) => setForm({ ...form, replyTo: event.target.value })}
          />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <ToggleRow
            label="Track opens"
            checked={form.trackOpens}
            onCheckedChange={(trackOpens) => setForm({ ...form, trackOpens })}
          />
          <ToggleRow
            label="Track clicks"
            checked={form.trackClicks}
            onCheckedChange={(trackClicks) => setForm({ ...form, trackClicks })}
          />
          <ToggleRow
            label="Stop on unsubscribe"
            checked={form.stopOnUnsubscribe}
            onCheckedChange={(stopOnUnsubscribe) => setForm({ ...form, stopOnUnsubscribe })}
          />
          <ToggleRow
            label="Stop on bounce"
            checked={form.stopOnBounce}
            onCheckedChange={(stopOnBounce) => setForm({ ...form, stopOnBounce })}
          />
          <ToggleRow
            label="Stop on complaint"
            checked={form.stopOnComplaint}
            onCheckedChange={(stopOnComplaint) => setForm({ ...form, stopOnComplaint })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          {flow.status === "active" ? (
            <Button variant="outline" onClick={() => setStatus("pause")}>
              Pause
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStatus("activate")}>
              Activate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TriggerFilterEditor({
  triggerType,
  audienceFilter,
  onChange,
}: {
  triggerType: string;
  audienceFilter: AudienceFilter;
  onChange: (audienceFilter: AudienceFilter) => void;
}) {
  if (!isFilterableTrigger(triggerType)) return null;

  const trigger = triggerType as AutomationTriggerType;
  const field =
    trigger === "deal_stage_changed"
      ? "stageSlugs"
      : trigger === "contact_tag_added"
        ? "tags"
        : "statuses";
  const label =
    trigger === "deal_stage_changed"
      ? "Matching stage slugs"
      : trigger === "contact_tag_added"
        ? "Matching tags"
        : "Matching statuses";
  const helper =
    trigger === "deal_stage_changed"
      ? "Leave blank to run for every stage change. Use CRM stage slugs like meeting-booked or proposal-sent."
      : trigger === "contact_tag_added"
        ? "Leave blank to run for any newly added tag."
        : "Leave blank to run for any status change. Common values: subscriber, lead, qualified, customer.";

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label>{label}</Label>
      <Input
        value={formatList(audienceFilter[field])}
        placeholder={FILTER_PLACEHOLDERS[trigger]}
        onChange={(event) =>
          onChange({
            ...audienceFilter,
            [field]: parseList(event.target.value),
          })
        }
      />
      <p className="text-muted-foreground text-xs">{helper}</p>
    </div>
  );
}

function isFilterableTrigger(triggerType: string): triggerType is AutomationTriggerType {
  return ["contact_status_changed", "contact_tag_added", "deal_stage_changed"].includes(
    triggerType,
  );
}

function parseAudienceFilter(value: unknown): AudienceFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const filter = value as AudienceFilter;
  return {
    statuses: Array.isArray(filter.statuses) ? filter.statuses : [],
    tags: Array.isArray(filter.tags) ? filter.tags : [],
    stageSlugs: Array.isArray(filter.stageSlugs) ? filter.stageSlugs : [],
  };
}

function normalizeAudienceFilter(triggerType: string, filter: AudienceFilter): AudienceFilter {
  if (triggerType === "contact_status_changed")
    return compactAudienceFilter({ statuses: filter.statuses });
  if (triggerType === "contact_tag_added") return compactAudienceFilter({ tags: filter.tags });
  if (triggerType === "deal_stage_changed")
    return compactAudienceFilter({ stageSlugs: filter.stageSlugs });
  return {};
}

function resetAudienceFilter(triggerType: string, filter: AudienceFilter): AudienceFilter {
  if (triggerType === "contact_status_changed") return { statuses: filter.statuses ?? [] };
  if (triggerType === "contact_tag_added") return { tags: filter.tags ?? [] };
  if (triggerType === "deal_stage_changed") return { stageSlugs: filter.stageSlugs ?? [] };
  return {};
}

function compactAudienceFilter(filter: AudienceFilter): AudienceFilter {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => Array.isArray(value) && value.length > 0),
  ) as AudienceFilter;
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

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
