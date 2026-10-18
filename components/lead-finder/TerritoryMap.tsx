"use client";

/**
 * Territory map: shows ZIP outlines and lets you draw, reshape and remove areas.
 * Leaflet + Geoman drawing, adapted from PawOs2's ServiceAreaMap.svelte @ b78f88e.
 * Leaflet touches `window`, so it is imported only in the browser.
 */
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import type {} from "@geoman-io/leaflet-geoman-free";
import type { FeatureGroup, LatLng, Map as LeafletMap, Polygon } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { ringError } from "@/lib/lead-finder/territories/geometry";
import type { MapTileConfig } from "@/lib/lead-finder/territories/map-tiles";
import type { GeoPoint, GeoPolygon, TerritoryZip } from "@/lib/lead-finder/territories/types";

type LeafletModule = typeof import("leaflet");
type Mode = "idle" | "draw" | "edit" | "remove";

const DRAWN_STYLE = { color: "#7c3aed", weight: 2, fillOpacity: 0.18 };
const ZIP_STYLE = { color: "#0f766e", weight: 1.5, fillOpacity: 0.08, dashArray: "4 4" };
const ZIP_ATTRIBUTION = "ZIP areas: U.S. Census Bureau";
const US_CENTER: [number, number] = [39.5, -98.35];

function outerRing(polygon: Polygon): GeoPoint[] {
  const rings = polygon.getLatLngs();
  const outer = (Array.isArray(rings[0]) ? rings[0] : rings) as LatLng[];
  return outer.map((point) => ({
    lat: Math.round(point.lat * 1e6) / 1e6,
    lng: Math.round(point.lng * 1e6) / 1e6,
  }));
}

export function TerritoryMap({
  tiles,
  polygons,
  zips,
  onPolygonsChange,
  editable = true,
}: {
  tiles: MapTileConfig;
  polygons: readonly GeoPolygon[];
  zips: readonly TerritoryZip[];
  onPolygonsChange: (polygons: GeoPolygon[]) => void;
  editable?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const drawnRef = useRef<FeatureGroup | null>(null);
  const zipRef = useRef<FeatureGroup | null>(null);
  const fittedRef = useRef(false);
  // Latest props for Leaflet event handlers registered once.
  const polygonsRef = useRef(polygons);
  const onChangeRef = useRef(onPolygonsChange);
  polygonsRef.current = polygons;
  onChangeRef.current = onPolygonsChange;

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState("");
  const [warning, setWarning] = useState("");

  /** Reads every drawn area from the map; holes are kept from the saved shape. */
  const readDrawn = useCallback((): GeoPolygon[] => {
    const L = leafletRef.current;
    const group = drawnRef.current;
    if (!L || !group) return [];
    return group
      .getLayers()
      .filter((layer): layer is Polygon => layer instanceof L.Polygon)
      .map((layer) => {
        const index = (layer as Polygon & { territoryIndex?: number }).territoryIndex;
        const holes = index === undefined ? [] : (polygonsRef.current[index]?.holes ?? []);
        return { outer: outerRing(layer), holes };
      });
  }, []);

  const fitAll = useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const layers = [
      ...(drawnRef.current?.getLayers() ?? []),
      ...(zipRef.current?.getLayers() ?? []),
    ];
    if (layers.length === 0) return;
    map.fitBounds(L.featureGroup(layers).getBounds(), {
      padding: [24, 24],
      maxZoom: 13,
      animate: false,
    });
  }, []);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    void (async () => {
      try {
        const imported = await import("leaflet");
        const L = (imported as { default?: LeafletModule }).default ?? imported;
        await import("@geoman-io/leaflet-geoman-free");
        const host = hostRef.current;
        if (cancelled || !host) return;
        leafletRef.current = L;
        const map = L.map(host, { scrollWheelZoom: false }).setView(US_CENTER, 4);
        mapRef.current = map;
        L.tileLayer(tiles.url, {
          attribution: tiles.attribution,
          maxZoom: 19,
          pmIgnore: true,
        }).addTo(map);
        map.attributionControl.addAttribution(ZIP_ATTRIBUTION);
        zipRef.current = L.featureGroup().addTo(map);
        drawnRef.current = L.featureGroup().addTo(map);
        if (editable) {
          // No Geoman toolbar: the buttons above the map drive every mode.
          map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: false });
          map.on("pm:create", (event) => {
            const layer = event.layer;
            map.removeLayer(layer);
            setMode("idle");
            if (!(layer instanceof L.Polygon)) return;
            const outer = outerRing(layer);
            const problem = ringError(outer);
            if (problem) {
              setWarning(`${problem}. That area was not added.`);
              return;
            }
            setWarning("");
            setStatus("Area added. Save the territory to keep it.");
            onChangeRef.current([...polygonsRef.current, { outer, holes: [] }]);
          });
          map.on("pm:drawend", () => setMode((current) => (current === "draw" ? "idle" : current)));
        }
        observer = new ResizeObserver(() => map.invalidateSize({ pan: false, animate: false }));
        observer.observe(host);
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      drawnRef.current = null;
      zipRef.current = null;
    };
  }, [tiles.url, tiles.attribution, editable]);

  // Draw the ZIP outlines.
  useEffect(() => {
    const L = leafletRef.current;
    const group = zipRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    for (const zip of zips) {
      for (const polygon of zip.polygons) {
        L.polygon(
          [
            polygon.outer.map((p) => [p.lat, p.lng] as [number, number]),
            ...polygon.holes.map((hole) => hole.map((p) => [p.lat, p.lng] as [number, number])),
          ],
          { ...ZIP_STYLE, pmIgnore: true, interactive: true },
        )
          .bindTooltip(`ZIP ${zip.zip}`, { sticky: true })
          .addTo(group);
      }
    }
  }, [ready, zips]);

  // Draw the drawn areas, and make edits flow back up.
  useEffect(() => {
    const L = leafletRef.current;
    const group = drawnRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    polygons.forEach((polygon, index) => {
      const layer = L.polygon(
        [
          polygon.outer.map((p) => [p.lat, p.lng] as [number, number]),
          ...polygon.holes.map((hole) => hole.map((p) => [p.lat, p.lng] as [number, number])),
        ],
        DRAWN_STYLE,
      ) as Polygon & { territoryIndex?: number };
      layer.territoryIndex = index;
      const commit = () => {
        const problem = ringError(outerRing(layer));
        if (problem) {
          setWarning(`${problem}. That change was undone.`);
          onChangeRef.current([...polygonsRef.current]);
          return;
        }
        setWarning("");
        onChangeRef.current(readDrawn());
      };
      layer.on("pm:edit", commit);
      layer.on("pm:dragend", commit);
      layer.on("pm:remove", () => {
        onChangeRef.current(polygonsRef.current.filter((_, i) => i !== index));
        setStatus("Area removed. Save the territory to keep the change.");
      });
      layer.addTo(group);
    });
    const map = mapRef.current;
    if (map && mode === "edit") {
      map.pm.enableGlobalEditMode({ allowSelfIntersection: false, snappable: false });
    }
    if (map && mode === "remove") map.pm.enableGlobalRemovalMode();
  }, [ready, polygons, readDrawn, mode]);

  // Zoom to the territory the first time there is something to show.
  useEffect(() => {
    if (!ready || fittedRef.current) return;
    if (polygons.length === 0 && zips.length === 0) return;
    fittedRef.current = true;
    fitAll();
  }, [ready, polygons, zips, fitAll]);

  const stopModes = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.pm.disableDraw();
    if (map.pm.globalEditModeEnabled()) map.pm.disableGlobalEditMode();
    if (map.pm.globalRemovalModeEnabled()) map.pm.disableGlobalRemovalMode();
    setMode("idle");
  }, []);

  const startDrawing = (shape: "Polygon" | "Rectangle") => {
    const map = mapRef.current;
    if (!map) return;
    stopModes();
    map.pm.enableDraw(shape, { allowSelfIntersection: false, snappable: false });
    setMode("draw");
    setWarning("");
    setStatus(
      shape === "Polygon"
        ? "Click the map to place each corner. Click the first corner again to finish."
        : "Click and drag on the map to draw a rectangle.",
    );
  };

  const startEditing = () => {
    const map = mapRef.current;
    if (!map) return;
    stopModes();
    map.pm.enableGlobalEditMode({ allowSelfIntersection: false, snappable: false });
    setMode("edit");
    setStatus(
      "Drag a corner to move it, or drag a middle handle to add one. Click Done when finished.",
    );
  };

  const startRemoving = () => {
    const map = mapRef.current;
    if (!map) return;
    stopModes();
    map.pm.enableGlobalRemovalMode();
    setMode("remove");
    setStatus("Click a drawn area to remove it. Click Done when finished.");
  };

  if (failed) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        The map could not load. You can still build the territory from ZIP codes.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "draw" ? "default" : "outline"}
            disabled={!ready}
            onClick={() => startDrawing("Polygon")}
          >
            Draw area
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!ready}
            onClick={() => startDrawing("Rectangle")}
          >
            Draw rectangle
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "edit" ? "default" : "outline"}
            disabled={!ready || polygons.length === 0}
            onClick={startEditing}
          >
            Reshape
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "remove" ? "default" : "outline"}
            disabled={!ready || polygons.length === 0}
            onClick={startRemoving}
          >
            Remove area
          </Button>
          {mode !== "idle" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                stopModes();
                setStatus("");
              }}
            >
              Done
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={!ready} onClick={fitAll}>
            Zoom to territory
          </Button>
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="h-[420px] w-full overflow-hidden rounded-lg border"
        role="application"
        aria-label="Territory map"
      />
      <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {warning ? <span className="text-destructive">{warning}</span> : status}
      </p>
    </div>
  );
}
