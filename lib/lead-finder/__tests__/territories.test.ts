import { describe, expect, it } from "vitest";
import { normalizeRecord, resolveColumns } from "../normalize";
import {
  fetchZipOutline,
  geocodeAddress,
  geocoderMatch,
  zctaPolygons,
} from "../territories/census";
import {
  parseZipList,
  polygonError,
  ringError,
  territoryMembership,
  territoryShapeError,
} from "../territories/geometry";
import {
  parseCoordinates,
  parsePostalCode,
  postalCodeFromAddress,
  postalCodeFromDetailedAddress,
} from "../territories/location";
import { mapTileConfig, tileOrigin } from "../territories/map-tiles";
import { resolveZipOutlines } from "../territories/service";
import type { GeoPoint, GeoPolygon, TerritoryShape, TerritoryZip } from "../territories/types";

const square = (south: number, west: number, size: number): GeoPoint[] => [
  { lat: south, lng: west },
  { lat: south, lng: west + size },
  { lat: south + size, lng: west + size },
  { lat: south + size, lng: west },
];
const area = (outer: GeoPoint[], holes: GeoPoint[][] = []): GeoPolygon => ({ outer, holes });
const shape = (polygons: GeoPolygon[], zips: TerritoryZip[] = []): TerritoryShape => ({
  polygons,
  zips,
});

describe("ringError", () => {
  it("accepts a simple square", () => {
    expect(ringError(square(38, -77, 0.1))).toBeNull();
  });

  it.each([
    ["too few corners", square(38, -77, 0.1).slice(0, 2), "at least 3"],
    [
      "crossing edges (bow tie)",
      [
        { lat: 38, lng: -77 },
        { lat: 38.1, lng: -76.9 },
        { lat: 38, lng: -76.9 },
        { lat: 38.1, lng: -77 },
      ],
      "cross",
    ],
    [
      "a repeated corner",
      [
        { lat: 38, lng: -77 },
        { lat: 38, lng: -76.9 },
        { lat: 38, lng: -77 },
        { lat: 38.1, lng: -77 },
      ],
      "repeats",
    ],
    [
      "no size (all on one line)",
      [
        { lat: 38, lng: -77 },
        { lat: 38, lng: -76.9 },
        { lat: 38, lng: -76.8 },
      ],
      "folds back|no size",
    ],
    [
      "out-of-range coordinates",
      [
        { lat: 91, lng: -77 },
        { lat: 38, lng: -76.9 },
        { lat: 38.1, lng: -77 },
      ],
      "invalid",
    ],
    [
      "crossing the date line",
      [
        { lat: 10, lng: 179 },
        { lat: 10, lng: -179 },
        { lat: 11, lng: -179 },
      ],
      "date line",
    ],
  ])("rejects %s", (_label, ring, message) => {
    expect(ringError(ring)).toMatch(new RegExp(message));
  });
});

describe("polygonError", () => {
  it("accepts a hole fully inside its area", () => {
    expect(polygonError(area(square(38, -77, 1), [square(38.2, -76.8, 0.2)]))).toBeNull();
  });

  it("rejects a hole that sticks out of its area", () => {
    expect(polygonError(area(square(38, -77, 1), [square(38.9, -76.5, 0.5)]))).toMatch(
      /inside its area/,
    );
  });

  it("rejects overlapping holes", () => {
    expect(
      polygonError(area(square(38, -77, 1), [square(38.2, -76.8, 0.3), square(38.3, -76.7, 0.3)])),
    ).toMatch(/overlap/);
  });
});

describe("territoryShapeError", () => {
  it("requires at least one ZIP or drawn area", () => {
    expect(territoryShapeError(shape([]))).toMatch(/at least one/);
  });

  it("rejects a bad drawn area", () => {
    expect(territoryShapeError(shape([area(square(38, -77, 0.1).slice(0, 2))]))).toMatch(
      /at least 3/,
    );
  });
});

describe("territoryMembership", () => {
  const drawn = shape([area(square(38, -77, 1), [square(38.4, -76.6, 0.2)])]);
  const zip22401: TerritoryZip = {
    zip: "22401",
    source: "test",
    polygons: [area(square(38.28, -77.5, 0.05))],
  };

  it("is inside when the point is in a drawn area", () => {
    expect(territoryMembership(drawn, { point: { lat: 38.1, lng: -76.9 }, postalCode: null })).toBe(
      "inside",
    );
  });

  it("counts a point on the edge as inside", () => {
    expect(territoryMembership(drawn, { point: { lat: 38, lng: -76.5 }, postalCode: null })).toBe(
      "inside",
    );
  });

  it("is outside when the point is in a hole", () => {
    expect(territoryMembership(drawn, { point: { lat: 38.5, lng: -76.5 }, postalCode: null })).toBe(
      "outside",
    );
  });

  it("is outside when the point is beyond every area", () => {
    expect(territoryMembership(drawn, { point: { lat: 40, lng: -75 }, postalCode: null })).toBe(
      "outside",
    );
  });

  it("is inside when the business's ZIP is one of the territory's ZIPs", () => {
    expect(territoryMembership(shape([], [zip22401]), { point: null, postalCode: "22401" })).toBe(
      "inside",
    );
  });

  it("uses the point inside a ZIP outline even when the ZIP field is different", () => {
    expect(
      territoryMembership(shape([], [zip22401]), {
        point: { lat: 38.3, lng: -77.47 },
        postalCode: "22405",
      }),
    ).toBe("inside");
  });

  it("is outside for a different ZIP when there is no point", () => {
    expect(territoryMembership(shape([], [zip22401]), { point: null, postalCode: "22405" })).toBe(
      "outside",
    );
  });

  it("is unknown (Not checked) for a ZIP when only drawn areas exist and there is no point", () => {
    expect(territoryMembership(drawn, { point: null, postalCode: "22401" })).toBe("unknown");
  });

  it("is unknown (Not checked) when the location is missing entirely", () => {
    expect(territoryMembership(drawn, { point: null, postalCode: null })).toBe("unknown");
  });
});

describe("parseZipList", () => {
  it("sorts and de-duplicates ZIPs split by commas, spaces or new lines", () => {
    expect(parseZipList("22405, 22401\n22401;22407")).toEqual({
      ok: true,
      value: ["22401", "22405", "22407"],
    });
  });

  it("rejects anything that is not a 5-digit ZIP", () => {
    expect(parseZipList("22401, 2240")).toEqual({
      ok: false,
      error: '"2240" is not a 5-digit ZIP',
    });
  });

  it("accepts an empty list", () => {
    expect(parseZipList("  ")).toEqual({ ok: true, value: [] });
  });
});

describe("location parsing", () => {
  it("reads omkar coordinates objects and their JSON text", () => {
    expect(parseCoordinates({ latitude: 38.3, longitude: -77.46 })).toEqual({
      lat: 38.3,
      lng: -77.46,
    });
    expect(parseCoordinates('{"latitude": 38.3, "longitude": -77.46}')).toEqual({
      lat: 38.3,
      lng: -77.46,
    });
    expect(parseCoordinates("38.3, -77.46")).toEqual({ lat: 38.3, lng: -77.46 });
  });

  it("treats missing, (0, 0) and out-of-range coordinates as unknown", () => {
    expect(parseCoordinates(null)).toBeNull();
    expect(parseCoordinates({ latitude: 0, longitude: 0 })).toBeNull();
    expect(parseCoordinates({ latitude: 95, longitude: -77 })).toBeNull();
    expect(parseCoordinates("not a place")).toBeNull();
  });

  it("reads ZIPs from postal code fields and detailed_address", () => {
    expect(parsePostalCode("22401-1234")).toBe("22401");
    expect(parsePostalCode(22401)).toBe("22401");
    expect(parsePostalCode("2240")).toBeNull();
    expect(postalCodeFromDetailedAddress({ postal_code: "22401", city: "Fredericksburg" })).toBe(
      "22401",
    );
    expect(postalCodeFromDetailedAddress('{"postal_code":"22405"}')).toBe("22405");
  });

  it("reads the ZIP at the end of a US address but never a street number", () => {
    expect(postalCodeFromAddress("1001 Princess Anne St, Fredericksburg, VA 22401")).toBe("22401");
    expect(postalCodeFromAddress("1001 Princess Anne St, Fredericksburg, VA 22401-1234, USA")).toBe(
      "22401",
    );
    expect(postalCodeFromAddress("12345 Main St, Springfield")).toBeNull();
    expect(postalCodeFromAddress(null)).toBeNull();
  });

  it("normalizes omkar export location columns", () => {
    const record = {
      name: "Acme Plumbing",
      address: "1 Main St, Fredericksburg, VA 22401",
      coordinates: '{"latitude": 38.3, "longitude": -77.46}',
      detailed_address: '{"postal_code": "22405"}',
    };
    const business = normalizeRecord(record, resolveColumns(Object.keys(record)));
    expect(business?.point).toEqual({ lat: 38.3, lng: -77.46 });
    // The structured postal code wins over the address text.
    expect(business?.postalCode).toBe("22405");
  });

  it("normalizes separate latitude / longitude / zip CSV columns", () => {
    const record = { Name: "Acme", Latitude: "38.3", Longitude: "-77.46", "Zip Code": "22401" };
    const business = normalizeRecord(record, resolveColumns(Object.keys(record)));
    expect(business?.point).toEqual({ lat: 38.3, lng: -77.46 });
    expect(business?.postalCode).toBe("22401");
  });

  it("leaves location unknown when the source has none", () => {
    const record = { name: "Acme" };
    const business = normalizeRecord(record, resolveColumns(Object.keys(record)));
    expect(business?.point).toBeNull();
    expect(business?.postalCode).toBeNull();
  });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const zctaBody = (zip: string, ring: number[][]) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { ZCTA5: zip },
      geometry: { type: "Polygon", coordinates: [ring] },
    },
  ],
});

describe("Census ZIP outlines", () => {
  const ring = [
    [-77.5, 38.28],
    [-77.45, 38.28],
    [-77.45, 38.33],
    [-77.5, 38.33],
    [-77.5, 38.28],
  ];

  it("converts a TIGERweb polygon, dropping the repeated closing corner", () => {
    expect(zctaPolygons(zctaBody("22401", ring), "22401")).toEqual([
      {
        outer: [
          { lat: 38.28, lng: -77.5 },
          { lat: 38.28, lng: -77.45 },
          { lat: 38.33, lng: -77.45 },
          { lat: 38.33, lng: -77.5 },
        ],
        holes: [],
      },
    ]);
  });

  it("ignores a feature for a different ZIP", () => {
    expect(zctaPolygons(zctaBody("22405", ring), "22401")).toBeNull();
  });

  it("calls only the fixed TIGERweb host, with the ZIP in an encoded query value", async () => {
    const urls: string[] = [];
    const result = await fetchZipOutline("22401", {
      fetcher: async (url) => {
        urls.push(url);
        return json(zctaBody("22401", ring));
      },
    });
    expect(result.ok).toBe(true);
    expect(urls).toHaveLength(1);
    const url = new URL(urls[0] ?? "");
    expect(url.origin).toBe("https://tigerweb.geo.census.gov");
    expect(url.searchParams.get("where")).toBe("ZCTA5='22401'");
  });

  it("rejects a non-ZIP without calling the Census", async () => {
    let called = false;
    const result = await fetchZipOutline("22401' OR 1=1", {
      fetcher: async () => {
        called = true;
        return json({});
      },
    });
    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(called).toBe(false);
  });

  it("reports not_found for a ZIP with no Census area", async () => {
    const result = await fetchZipOutline("00000", {
      fetcher: async () => json({ type: "FeatureCollection", features: [] }),
    });
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("reports unavailable on a server error or network failure, never throws", async () => {
    expect(await fetchZipOutline("22401", { fetcher: async () => json({}, 503) })).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(
      await fetchZipOutline("22401", {
        fetcher: async () => {
          throw new Error("offline");
        },
      }),
    ).toEqual({ ok: false, error: "unavailable" });
  });

  it("refuses a response larger than the size limit", async () => {
    const result = await fetchZipOutline("22401", {
      fetcher: async () =>
        new Response("x".repeat(10), { headers: { "content-length": String(3 * 1024 * 1024) } }),
    });
    expect(result).toEqual({ ok: false, error: "unavailable" });
  });
});

describe("Census geocoder", () => {
  const match = {
    result: {
      addressMatches: [
        {
          coordinates: { x: -77.460629512322, y: 38.303374891191 },
          addressComponents: { zip: "22401" },
        },
      ],
    },
  };

  it("reads the first match's point and ZIP", () => {
    expect(geocoderMatch(match)).toEqual({
      point: { lat: 38.30337, lng: -77.46063 },
      postalCode: "22401",
    });
  });

  it("returns null when the Census has no match and undefined for a malformed body", () => {
    expect(geocoderMatch({ result: { addressMatches: [] } })).toBeNull();
    expect(geocoderMatch({ nope: true })).toBeUndefined();
  });

  it("calls only the fixed geocoder host", async () => {
    const urls: string[] = [];
    const result = await geocodeAddress("1001 Princess Anne St, Fredericksburg, VA 22401", {
      fetcher: async (url) => {
        urls.push(url);
        return json(match);
      },
    });
    expect(result.ok).toBe(true);
    expect(new URL(urls[0] ?? "").origin).toBe("https://geocoding.geo.census.gov");
  });
});

describe("resolveZipOutlines", () => {
  const outline = (zip: string): TerritoryZip => ({
    zip,
    source: "test",
    polygons: [area(square(38, -77, 0.1))],
  });

  it("reuses stored outlines and fetches only new ZIPs", async () => {
    const asked: string[] = [];
    const result = await resolveZipOutlines(["22401", "22405"], [outline("22401")], {
      lookup: async (zip) => {
        asked.push(zip);
        return { ok: true, value: outline(zip) };
      },
    });
    expect(asked).toEqual(["22405"]);
    expect(result.ok && result.zips.map((z) => z.zip)).toEqual(["22401", "22405"]);
  });

  it("names the ZIPs the Census has no area for", async () => {
    const result = await resolveZipOutlines(["22401", "00000"], [], {
      lookup: async (zip) =>
        zip === "00000" ? { ok: false, error: "not_found" } : { ok: true, value: outline(zip) },
    });
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: expect.stringContaining("00000"),
    });
  });

  it("fails as unavailable rather than saving a partial territory", async () => {
    const result = await resolveZipOutlines(["22401"], [], {
      lookup: async () => ({ ok: false, error: "unavailable" }),
    });
    expect(result).toMatchObject({ ok: false, status: 502 });
  });
});

describe("map tiles", () => {
  it("defaults to OpenStreetMap with attribution", () => {
    const config = mapTileConfig({});
    expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(config.attribution).toContain("OpenStreetMap");
    expect(tileOrigin(config.url)).toBe("https://tile.openstreetmap.org");
  });

  it("uses a configured https tile URL and allows only its host", () => {
    const config = mapTileConfig({
      MAP_TILE_URL: "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=abc",
      MAP_TILE_ATTRIBUTION: "MapTiler",
    });
    expect(tileOrigin(config.url)).toBe("https://api.maptiler.com");
    expect(tileOrigin("https://{s}.tile.example.com/{z}/{x}/{y}.png")).toBe(
      "https://*.tile.example.com",
    );
  });

  it("ignores an http or malformed tile URL", () => {
    expect(
      mapTileConfig({ MAP_TILE_URL: "http://tiles.example.com/{z}/{x}/{y}.png" }).url,
    ).toContain("openstreetmap");
    expect(mapTileConfig({ MAP_TILE_URL: "https://x.com/'; script-src *" }).url).toContain(
      "openstreetmap",
    );
  });
});
