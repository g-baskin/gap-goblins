"use client";

import { IconArrowLeft, IconDownload } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { toCsv } from "@/lib/lead-finder/csv";
import type { LeadScanRow, ScanResultListItem } from "@/lib/lead-finder/queries";
import { GAP_LABELS, gapFlagKeys } from "@/lib/lead-finder/scoring-config";
import { TERRITORY_STATUS_LABELS, type TerritoryStatus } from "@/lib/lead-finder/territories/types";
import { cn } from "@/lib/utils";
import {
  type AvailableTenant,
  formatDate,
  GapBadges,
  NoTenant,
  ScorePill,
  StatusBadge,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "./shared";

type ScanResponse = { scan: LeadScanRow; results: ScanResultListItem[] };

function TerritoryBadge({ status }: { status: TerritoryStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium",
        status === "inside" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        status === "outside" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        status === "unknown" && "bg-muted text-muted-foreground",
      )}
      title={
        status === "unknown"
          ? "No map location or ZIP code was found for this business, so it was kept."
          : undefined
      }
    >
      {TERRITORY_STATUS_LABELS[status]}
    </span>
  );
}

export function ScanDetail({ tenants, scanId }: { tenants: AvailableTenant[]; scanId: string }) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/lead-finder">
          <IconArrowLeft className="size-4" /> Lead Finder
        </Link>
      </Button>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <ScanView key={tenantId} tenantId={tenantId} scanId={scanId} />
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

function ScanView({ tenantId, scanId }: { tenantId: string; scanId: string }) {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    tenantFetch<ScanResponse>(tenantId, `/api/lead-finder/scans/${scanId}`)
      .then((body) => {
        setData(body);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the scan"));
  }, [tenantId, scanId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = data?.scan.status === "queued" || data?.scan.status === "running";
  // Poll every 2 seconds while the scan is in progress (no websockets).
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [active, load]);

  const csvHref = useMemo(() => {
    if (!data?.results.length) return null;
    const csv = toCsv(
      [
        "Score",
        "Name",
        "Category",
        "Phone",
        "Website",
        "Address",
        "Rating",
        "Reviews",
        "Gaps",
        ...(data.scan.territoryName ? ["Territory"] : []),
      ],
      data.results.map((r) => [
        r.score,
        r.name,
        r.mainCategory,
        r.phone,
        r.website,
        r.address,
        r.rating,
        r.reviewCount,
        gapFlagKeys
          .filter((k) => r.flags[k] === true)
          .map((k) => GAP_LABELS[k])
          .join("; "),
        ...(data.scan.territoryName
          ? [r.territoryStatus ? TERRITORY_STATUS_LABELS[r.territoryStatus] : ""]
          : []),
      ]),
    );
    return URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  }, [data]);
  useEffect(
    () => () => {
      if (csvHref) URL.revokeObjectURL(csvHref);
    },
    [csvHref],
  );

  async function cancel() {
    try {
      await tenantFetch(tenantId, `/api/lead-finder/scans/${scanId}`, { method: "DELETE" });
      toast.success("Scan cancelled");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { scan, results } = data;
  const progress = Math.min(scan.processedCount, scan.maxResults);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {scan.niche} · {scan.location}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={scan.status} />
            <span>Source: {scan.source}</span>
            {scan.sourceFileName ? <span>· {scan.sourceFileName}</span> : null}
            {scan.territoryName ? <span>· Territory: {scan.territoryName}</span> : null}
            <span>· Started {formatDate(scan.startedAt ?? scan.createdAt)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {active ? (
            <Button variant="outline" onClick={cancel}>
              Cancel scan
            </Button>
          ) : null}
          {csvHref ? (
            <Button asChild variant="outline">
              <a href={csvHref} download={`gap-goblins-scan-${scan.id.slice(0, 8)}.csv`}>
                <IconDownload className="size-4" /> Export CSV
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {scan.status === "failed" ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {scan.errorMessage ?? "The scan failed."}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Found", scan.foundCount],
          ["Scored", scan.processedCount],
          ["New prospects", scan.createdCount],
          ["Updated", scan.updatedCount],
          ["Skipped (closed)", scan.skippedClosedCount],
          ...(scan.territoryName
            ? [["Outside territory", scan.skippedOutsideTerritoryCount] as const]
            : []),
          ["Errors", scan.errorCount],
        ].map(([label, value]) => (
          <Card key={label} className="py-3">
            <CardContent className="px-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {active ? (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${scan.maxResults ? (progress / scan.maxResults) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Working… this page refreshes every 2 seconds.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prospects, weakest online presence first</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {active ? "Results will appear here." : "No prospects in this scan."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Score</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Gaps</TableHead>
                  {scan.territoryName ? <TableHead>Territory</TableHead> : null}
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.scanResultId}>
                    <TableCell>
                      <ScorePill score={r.score} />
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <Link
                        href={`/admin/lead-finder/prospects/${r.businessId}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {[r.mainCategory, r.phone].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <GapBadges flags={r.flags} max={4} />
                    </TableCell>
                    {scan.territoryName ? (
                      <TableCell>
                        <TerritoryBadge status={r.territoryStatus} />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right tabular-nums">
                      {r.rating?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.reviewCount ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
