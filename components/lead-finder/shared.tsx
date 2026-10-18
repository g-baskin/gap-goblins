"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/shadcn/ui/badge";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import type { FlagValue, GapFlags } from "@/lib/lead-finder/scoring";
import { GAP_LABELS, type GapFlagKey, gapFlagKeys } from "@/lib/lead-finder/scoring-config";
import { cn } from "@/lib/utils";

export type AvailableTenant = { id: string; name: string; slug: string; role: string };

const STORAGE_KEY = "gap-goblins.lead-finder.tenant";

/** Active tenant for Lead Finder pages, remembered across pages in localStorage. */
export function useLeadFinderTenant(tenants: AvailableTenant[]) {
  const [tenantId, setTenantIdState] = useState(tenants.length === 1 ? tenants[0].id : "");
  useEffect(() => {
    if (tenants.length <= 1) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && tenants.some((t) => t.id === saved)) setTenantIdState(saved);
  }, [tenants]);
  const setTenantId = useCallback((id: string) => {
    setTenantIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }, []);
  return { tenantId, setTenantId };
}

export function TenantPicker({
  tenants,
  tenantId,
  onChange,
}: {
  tenants: AvailableTenant[];
  tenantId: string;
  onChange: (id: string) => void;
}) {
  if (tenants.length <= 1) return null;
  return (
    <div className="max-w-xs space-y-2">
      <Label htmlFor="lead-finder-tenant">Workspace</Label>
      <Select value={tenantId} onValueChange={onChange}>
        <SelectTrigger id="lead-finder-tenant" className="w-full">
          <SelectValue placeholder="Select a workspace" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NoTenant({ tenants }: { tenants: AvailableTenant[] }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {tenants.length === 0
        ? "You don't belong to an active workspace yet."
        : "Select a workspace to continue."}
    </div>
  );
}

export async function tenantFetch<T>(
  tenantId: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-tenant-id", tenantId);
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export function scoreTone(score: number) {
  if (score >= 60) return "bg-red-600 text-white";
  if (score >= 30) return "bg-amber-500 text-white";
  return "bg-emerald-600 text-white";
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
        scoreTone(score),
        className,
      )}
      title="Gap Score (higher = more gaps)"
    >
      {score}
    </span>
  );
}

export function GapBadges({ flags, max }: { flags: GapFlags; max?: number }) {
  const gaps = gapFlagKeys.filter((key) => flags[key] === true);
  const shown = max ? gaps.slice(0, max) : gaps;
  if (gaps.length === 0)
    return <span className="text-xs text-muted-foreground">No gaps found</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((key) => (
        <Badge
          key={key}
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {GAP_LABELS[key]}
        </Badge>
      ))}
      {max && gaps.length > max ? <Badge variant="secondary">+{gaps.length - max}</Badge> : null}
    </div>
  );
}

export function flagText(value: FlagValue): string {
  if (value === "unknown") return "Not checked";
  return value ? "Gap found" : "OK";
}

export function FlagStatus({
  flagKey,
  value,
  points,
}: {
  flagKey: GapFlagKey;
  value: FlagValue;
  points: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="text-sm">{GAP_LABELS[flagKey]}</span>
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium",
            value === true && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
            value === false &&
              "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            value === "unknown" && "bg-muted text-muted-foreground",
          )}
        >
          {flagText(value)}
        </span>
        <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
          {points > 0 ? `+${points}` : "0"}
        </span>
      </span>
    </div>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const statusStyles: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}
