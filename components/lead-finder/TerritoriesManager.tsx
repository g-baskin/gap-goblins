"use client";

import { IconArrowLeft, IconMapPin, IconPlus, IconTrash } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { DeleteConfirmDialog } from "@/components/shadcn/ui/delete-confirm-dialog";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import { parseZipList } from "@/lib/lead-finder/territories/geometry";
import type { MapTileConfig } from "@/lib/lead-finder/territories/map-tiles";
import type { TerritoryRecord } from "@/lib/lead-finder/territories/store";
import type { GeoPolygon, TerritoryZip } from "@/lib/lead-finder/territories/types";
import { TERRITORY_LIMITS } from "@/lib/lead-finder/territories/types";
import {
  type AvailableTenant,
  formatDate,
  NoTenant,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "./shared";

const TerritoryMap = dynamic(() => import("./TerritoryMap").then((m) => m.TerritoryMap), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-lg border bg-muted" />,
});

export function TerritoriesManager({
  tenants,
  tiles,
}: {
  tenants: AvailableTenant[];
  tiles: MapTileConfig;
}) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/lead-finder">
            <IconArrowLeft className="size-4" /> Lead Finder
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold md:text-3xl">Territories</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Mark out the areas you sell into with ZIP codes or by drawing on the map. Scans can then
          keep only businesses inside a territory.
        </p>
      </div>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <TerritoryWorkspace key={tenantId} tenantId={tenantId} tiles={tiles} />
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

function TerritoryWorkspace({ tenantId, tiles }: { tenantId: string; tiles: MapTileConfig }) {
  const [territories, setTerritories] = useState<TerritoryRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await tenantFetch<{ territories: TerritoryRecord[] }>(
        tenantId,
        "/api/lead-finder/territories",
      );
      setTerritories(data.territories);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load territories");
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    selectedId && selectedId !== "new"
      ? (territories?.find((t) => t.id === selectedId) ?? null)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Your territories</CardTitle>
            <CardDescription>{territories ? `${territories.length} saved` : " "}</CardDescription>
          </div>
          <Button size="sm" onClick={() => setSelectedId("new")}>
            <IconPlus className="size-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {territories === null && !loadError ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {territories?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No territories yet. Click New to add one.
            </p>
          ) : null}
          {territories?.map((territory) => (
            <button
              type="button"
              key={territory.id}
              onClick={() => setSelectedId(territory.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                selectedId === territory.id ? "border-primary bg-muted" : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <IconMapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{territory.name}</span>
              </div>
              <div className="pl-6 text-xs text-muted-foreground">
                {describe(territory)} · updated {formatDate(territory.updatedAt)}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
      {selectedId ? (
        <TerritoryEditor
          key={selectedId}
          tenantId={tenantId}
          tiles={tiles}
          territory={selected}
          onSaved={async (saved) => {
            await load();
            setSelectedId(saved.id);
          }}
          onDeleted={async () => {
            setSelectedId(null);
            await load();
          }}
        />
      ) : (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Select a territory to view or edit it, or click New.
        </div>
      )}
    </div>
  );
}

function describe(territory: Pick<TerritoryRecord, "zips" | "polygons">): string {
  const parts = [];
  if (territory.zips.length) {
    parts.push(`${territory.zips.length} ZIP${territory.zips.length === 1 ? "" : "s"}`);
  }
  if (territory.polygons.length) {
    parts.push(
      `${territory.polygons.length} drawn area${territory.polygons.length === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" + ") || "Empty";
}

function TerritoryEditor({
  tenantId,
  tiles,
  territory,
  onSaved,
  onDeleted,
}: {
  tenantId: string;
  tiles: MapTileConfig;
  territory: TerritoryRecord | null;
  onSaved: (territory: TerritoryRecord) => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [name, setName] = useState(territory?.name ?? "");
  const [zipText, setZipText] = useState(territory?.zips.map((z) => z.zip).join(", ") ?? "");
  const [polygons, setPolygons] = useState<GeoPolygon[]>(territory ? [...territory.polygons] : []);
  // Outlines known so far: saved ones plus previews fetched while typing.
  const [outlines, setOutlines] = useState<Map<string, TerritoryZip>>(
    () => new Map((territory?.zips ?? []).map((zip) => [zip.zip, zip])),
  );
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const parsed = useMemo(() => parseZipList(zipText), [zipText]);
  const zipCodes = parsed.ok ? parsed.value : [];
  const shownZips = useMemo(
    () => zipCodes.flatMap((zip) => outlines.get(zip) ?? []),
    [zipCodes, outlines],
  );
  const missingOutlines = zipCodes.filter((zip) => !outlines.has(zip));

  async function preview() {
    if (missingOutlines.length === 0) return;
    setPreviewing(true);
    const next = new Map(outlines);
    const problems: string[] = [];
    for (const zip of missingOutlines.slice(0, 20)) {
      try {
        const data = await tenantFetch<{ outline: TerritoryZip }>(
          tenantId,
          `/api/lead-finder/territories/zip-outline?zip=${encodeURIComponent(zip)}`,
        );
        next.set(zip, data.outline);
      } catch (error) {
        problems.push(error instanceof Error ? error.message : `ZIP ${zip} failed`);
      }
    }
    setOutlines(next);
    setPreviewing(false);
    if (problems.length) toast.error(problems[0]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    if (zipCodes.length === 0 && polygons.length === 0) {
      toast.error("Add at least one ZIP code or draw an area");
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({ name, zipCodes, polygons });
      const data = await tenantFetch<{ territory: TerritoryRecord }>(
        tenantId,
        territory ? `/api/lead-finder/territories/${territory.id}` : "/api/lead-finder/territories",
        {
          method: territory ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body,
        },
      );
      toast.success(territory ? "Territory saved" : "Territory created");
      await onSaved(data.territory);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the territory");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!territory) return;
    setDeleting(true);
    try {
      await tenantFetch(tenantId, `/api/lead-finder/territories/${territory.id}`, {
        method: "DELETE",
      });
      toast.success("Territory deleted");
      setDeleteOpen(false);
      await onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the territory");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{territory ? territory.name : "New territory"}</CardTitle>
        <CardDescription>
          A business counts as inside when its map point falls in a ZIP area or a drawn area. If
          only its ZIP code is known, a listed ZIP code also counts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="territory-name">Name</Label>
            <Input
              id="territory-name"
              value={name}
              maxLength={TERRITORY_LIMITS.nameLength}
              placeholder="e.g. Fredericksburg core"
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="territory-zips">ZIP codes</Label>
            <Textarea
              id="territory-zips"
              value={zipText}
              rows={3}
              placeholder="22401, 22405, 22407"
              onChange={(e) => setZipText(e.target.value)}
              aria-invalid={!parsed.ok}
              aria-describedby="territory-zips-help"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                id="territory-zips-help"
                className={`text-xs ${parsed.ok ? "text-muted-foreground" : "text-destructive"}`}
              >
                {parsed.ok
                  ? `${zipCodes.length} ZIP code${zipCodes.length === 1 ? "" : "s"}. Separate with commas or spaces. Outlines come from the U.S. Census Bureau.`
                  : parsed.error}
              </p>
              {missingOutlines.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={previewing}
                  onClick={preview}
                >
                  {previewing ? "Loading…" : `Show ${missingOutlines.length} on map`}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Drawn areas</span>
            <TerritoryMap
              tiles={tiles}
              polygons={polygons}
              zips={shownZips}
              onPolygonsChange={setPolygons}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="submit" disabled={saving || !parsed.ok}>
              {saving ? "Saving…" : territory ? "Save territory" : "Create territory"}
            </Button>
            {territory ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <IconTrash className="size-4" /> Delete
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete territory"
        itemName={territory?.name}
        description="Scans that used it keep their results and its name."
        onConfirm={onDelete}
        loading={deleting}
      />
    </Card>
  );
}
