"use client";

import { IconFileUpload, IconMapPin, IconPalette, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import type { LeadScanRow } from "@/lib/lead-finder/queries";
import {
  type AvailableTenant,
  formatDate,
  NoTenant,
  StatusBadge,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "./shared";

type SourceInfo = {
  id: string;
  label: string;
  available: boolean;
  contract: string;
  message: string;
};

const SOURCE_HINTS: Record<string, string> = {
  fixture: "Deterministic sample businesses for trying things out. Not real data.",
  "csv-import":
    "Upload a Google Maps Extractor (omkar) export or any CSV with a business name column. Max 5 MB / 5,000 rows.",
  "omkar-desktop":
    "Live search through the omkar desktop app. Disabled until its API contract is verified.",
};

type TerritoryOption = { id: string; name: string };
/** Select items cannot have an empty value, so "no territory" uses a sentinel. */
const NO_TERRITORY = "none";

export function LeadFinderHome({ tenants }: { tenants: AvailableTenant[] }) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Lead Finder</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Find local businesses with the weakest online presence, then send them a gap report.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/lead-finder/territories">
              <IconMapPin className="size-4" /> Territories
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/lead-finder/branding">
              <IconPalette className="size-4" /> Report branding
            </Link>
          </Button>
        </div>
      </div>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]" key={tenantId}>
          <ScanForm tenantId={tenantId} />
          <ScanHistory tenantId={tenantId} />
        </div>
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

function ScanForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [source, setSource] = useState("fixture");
  const [niche, setNiche] = useState("plumbers");
  const [location, setLocation] = useState("Fredericksburg VA");
  const [maxResults, setMaxResults] = useState(50);
  const [file, setFile] = useState<File | null>(null);
  const [territoryId, setTerritoryId] = useState(NO_TERRITORY);
  const [territories, setTerritories] = useState<TerritoryOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tenantFetch<{ sources: SourceInfo[] }>(tenantId, "/api/lead-finder/sources")
      .then((data) => setSources(data.sources))
      .catch(() => setSources([]));
    tenantFetch<{ territories: TerritoryOption[] }>(tenantId, "/api/lead-finder/territories")
      .then((data) => setTerritories(data.territories))
      .catch(() => setTerritories([]));
  }, [tenantId]);
  const scanTerritory = territoryId === NO_TERRITORY ? "" : territoryId;

  const selected = sources.find((s) => s.id === source);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      let init: RequestInit;
      if (source === "csv-import") {
        if (!file) throw new Error("Choose a CSV or JSON file");
        const form = new FormData();
        form.set("niche", niche);
        form.set("location", location);
        form.set("maxResults", String(maxResults));
        form.set("source", source);
        form.set("territoryId", scanTerritory);
        form.set("file", file);
        init = { method: "POST", body: form };
      } else {
        init = {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            niche,
            location,
            maxResults,
            source,
            ...(scanTerritory ? { territoryId: scanTerritory } : {}),
          }),
        };
      }
      const { scan } = await tenantFetch<{ scan: LeadScanRow }>(
        tenantId,
        "/api/lead-finder/scans",
        init,
      );
      toast.success("Scan started");
      router.push(`/admin/lead-finder/scans/${scan.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the scan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New scan</CardTitle>
        <CardDescription>Pick a niche and a location, or import an export.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scan-source">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="scan-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(sources.length
                  ? sources
                  : [{ id: "fixture", label: "Sample data (fixture)", available: true }]
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                    {!s.available ? " (unavailable)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{SOURCE_HINTS[source]}</p>
            {selected && !selected.available ? (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {selected.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-niche">Niche</Label>
            <Input
              id="scan-niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="plumbers"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-location">Location</Label>
            <Input
              id="scan-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Fredericksburg VA"
              required
              maxLength={200}
            />
            {source === "csv-import" ? (
              <p className="text-xs text-muted-foreground">
                For imports, niche and location are labels for your scan history.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-territory">Territory</Label>
            <Select value={territoryId} onValueChange={setTerritoryId}>
              <SelectTrigger id="scan-territory" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TERRITORY}>Any (no territory filter)</SelectItem>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {scanTerritory
                ? "Businesses outside the territory are skipped. Ones with no known location are kept and marked Not checked."
                : territories.length === 0
                  ? "Optional. Set up territories to keep only businesses in your areas."
                  : "Optional. Keep only businesses inside one of your territories."}{" "}
              <Link href="/admin/lead-finder/territories" className="text-primary hover:underline">
                Manage territories
              </Link>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-max">Max results</Label>
            <Input
              id="scan-max"
              type="number"
              min={1}
              max={1000}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value) || 50)}
            />
          </div>
          {source === "csv-import" ? (
            <div className="space-y-2">
              <Label htmlFor="scan-file">Export file</Label>
              <Input
                id="scan-file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || (selected ? !selected.available : false)}
          >
            {source === "csv-import" ? (
              <IconFileUpload className="size-4" />
            ) : (
              <IconSearch className="size-4" />
            )}
            {submitting ? "Starting…" : source === "csv-import" ? "Import and score" : "Find leads"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ScanHistory({ tenantId }: { tenantId: string }) {
  const [scans, setScans] = useState<LeadScanRow[] | null>(null);
  const load = useCallback(() => {
    tenantFetch<{ scans: LeadScanRow[] }>(tenantId, "/api/lead-finder/scans")
      .then((data) => setScans(data.scans))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not load scans");
        setScans([]);
      });
  }, [tenantId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!scans?.some((s) => s.status === "queued" || s.status === "running")) return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [scans, load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan history</CardTitle>
        <CardDescription>Most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {scans === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet. Start one on the left.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scan</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Prospects</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={`/admin/lead-finder/scans/${scan.id}`}
                    >
                      {scan.niche} · {scan.location}
                    </Link>
                    {scan.sourceFileName ? (
                      <div className="text-xs text-muted-foreground">{scan.sourceFileName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{scan.source}</TableCell>
                  <TableCell>
                    <StatusBadge status={scan.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{scan.processedCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{scan.createdCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(scan.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
