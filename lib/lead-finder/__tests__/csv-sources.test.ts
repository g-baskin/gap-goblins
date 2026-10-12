import { describe, expect, it, vi } from "vitest";
import { CSV_MAX_ROWS, CsvLimitError, parseCsv, toCsv, toSafeCsvCell } from "../csv";
import { capRawPayload, normalizeRecord, parseBool, resolveColumns } from "../normalize";
import { toUsE164 } from "../phone";
import { importBusinesses } from "../sources/csv-import";
import { FIXTURE_POOL_SIZE, fixtureBusinesses, fixtureSource } from "../sources/fixture";
import {
  checkOmkarHealth,
  looksLikeBotasaurusTaskList,
  omkarDesktopSource,
  readOmkarConfig,
} from "../sources/omkar-desktop";
import { LeadSourceInputError, LeadSourceUnavailableError } from "../types";

describe("toUsE164", () => {
  it.each([
    ["(540) 555-0123", "+15405550123"],
    ["540.555.0123", "+15405550123"],
    ["1-540-555-0123", "+15405550123"],
    ["+1 540 555 0123", "+15405550123"],
    ["540-555-0123 ext. 12", "+15405550123"],
    ["555-0123", null],
    ["+44 20 7946 0958", null],
    ["(140) 555-0123", null],
    ["", null],
    [null, null],
  ])("%s → %s", (input, expected) => {
    expect(toUsE164(input)).toBe(expected);
  });
});

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines, CRLF and BOM", () => {
    const csv =
      '\uFEFFNAME,ADDRESS,NOTE\r\n"Smith, Jones & Co","1 Main St\nSuite 2","He said ""hi"""\r\nSolo,,\r\n';
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["NAME", "ADDRESS", "NOTE"]);
    expect(parsed.rows).toEqual([
      { NAME: "Smith, Jones & Co", ADDRESS: "1 Main St\nSuite 2", NOTE: 'He said "hi"' },
      { NAME: "Solo", ADDRESS: "", NOTE: "" },
    ]);
  });

  it("rejects files over 5 MB", () => {
    const big = `NAME\n${"x".repeat(5 * 1024 * 1024)}`;
    expect(() => parseCsv(big)).toThrow(CsvLimitError);
  });

  it("rejects more than 5,000 rows but accepts exactly 5,000", () => {
    const ok = `NAME\n${Array.from({ length: CSV_MAX_ROWS }, (_, i) => `B${i}`).join("\n")}`;
    expect(parseCsv(ok).rows).toHaveLength(CSV_MAX_ROWS);
    const tooMany = `${ok}\nB-extra`;
    expect(() => parseCsv(tooMany)).toThrow(/5,000 rows/);
  });

  it("rejects an unterminated quote", () => {
    expect(() => parseCsv('NAME\n"broken')).toThrow(CsvLimitError);
  });
});

describe("formula-injection protection on re-export", () => {
  it.each([
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ["+1 540 555 0100", "'+1 540 555 0100"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tcmd", "'\tcmd"],
    ["Plain, name", '"Plain, name"'],
    ["Joe's Plumbing", "Joe's Plumbing"],
  ])("%s", (input, expected) => {
    expect(toSafeCsvCell(input)).toBe(expected);
  });

  it("round-trips safely", () => {
    const out = toCsv(["name"], [["=cmd|' /C calc'!A0"]]);
    const parsed = parseCsv(out);
    expect(parsed.rows[0].name.startsWith("'=")).toBe(true);
  });
});

describe("column mapping", () => {
  it("maps the omkar export preset (UPPER_SNAKE)", () => {
    const mapping = resolveColumns([
      "KGMID",
      "PLACE_ID",
      "CID",
      "LINK",
      "NAME",
      "DESCRIPTION",
      "MAIN_CATEGORY",
      "WEBSITE",
      "PHONE",
      "ADDRESS",
      "RATING",
      "REVIEWS",
      "OWNER_POSTS",
      "CAN_CLAIM",
      "IS_PERMANENTLY_CLOSED",
      "IS_TEMPORARILY_CLOSED",
      "IMAGE_COUNT",
      "HOURS",
    ]);
    expect(mapping).toMatchObject({
      kgmid: "KGMID",
      placeId: "PLACE_ID",
      cid: "CID",
      gbpUrl: "LINK",
      name: "NAME",
      description: "DESCRIPTION",
      mainCategory: "MAIN_CATEGORY",
      website: "WEBSITE",
      phone: "PHONE",
      reviewCount: "REVIEWS",
      ownerPosts: "OWNER_POSTS",
      canClaim: "CAN_CLAIM",
      imageCount: "IMAGE_COUNT",
      hours: "HOURS",
    });
  });

  it("maps generic headers case- and punctuation-insensitively", () => {
    const mapping = resolveColumns([
      "Business Name",
      "Phone Number",
      "Website URL",
      "Review Count",
    ]);
    expect(mapping).toMatchObject({
      name: "Business Name",
      phone: "Phone Number",
      website: "Website URL",
      reviewCount: "Review Count",
    });
  });

  it("missing columns stay unknown; empty cells in present columns mean 'none'", () => {
    const mapping = resolveColumns(["NAME", "WEBSITE", "DESCRIPTION"]);
    const business = normalizeRecord({ NAME: "Acme", WEBSITE: "", DESCRIPTION: "" }, mapping);
    expect(business).toMatchObject({
      website: "",
      hasDescription: false,
      hasHours: null,
      canClaim: null,
      reviewCount: null,
    });
  });

  it("parses booleans loosely and rejects junk as unknown", () => {
    expect([parseBool("TRUE"), parseBool("no"), parseBool("1"), parseBool("maybe")]).toEqual([
      true,
      false,
      true,
      null,
    ]);
  });

  it("caps oversized raw payloads", () => {
    const capped = capRawPayload({ a: "x".repeat(50_000), b: 1 }, 4096);
    expect(JSON.stringify(capped).length).toBeLessThanOrEqual(4096);
  });
});

describe("importBusinesses", () => {
  const omkarCsv = [
    "KGMID,PLACE_ID,NAME,PHONE,WEBSITE,REVIEWS,RATING,CAN_CLAIM,IMAGE_COUNT,IS_PERMANENTLY_CLOSED,EMAILS",
    "/g/1,P1,Ace Plumbing,(540) 555-0101,,4,3.5,TRUE,2,FALSE,",
    '/g/2,,"Bob\'s Pipes, LLC",540-555-0102,https://bob.example,80,4.8,FALSE,30,FALSE,"bob@bob.example, info@bob.example"',
    ",,,,,,,,,,",
  ].join("\n");

  it("detects an omkar export and normalizes rows", () => {
    const result = importBusinesses({ name: "plumbers.csv", content: omkarCsv });
    expect(result.format).toBe("omkar");
    expect(result.businesses).toHaveLength(2);
    expect(result.rejectedRows).toBe(1);
    expect(result.businesses[0]).toMatchObject({
      kgmid: "/g/1",
      name: "Ace Plumbing",
      phoneE164: "+15405550101",
      website: "",
      canClaim: true,
      reviewCount: 4,
      imageCount: 2,
      isPermanentlyClosed: false,
    });
    expect(result.businesses[1].email).toBe("bob@bob.example");
  });

  it("accepts an omkar JSON export", () => {
    const json = JSON.stringify([{ kgmid: "/g/9", name: "Json Co", reviews: 3 }]);
    const result = importBusinesses({ name: "x.json", content: json });
    expect(result.businesses[0]).toMatchObject({ kgmid: "/g/9", name: "Json Co", reviewCount: 3 });
  });

  it("rejects a file without a name column", () => {
    expect(() => importBusinesses({ name: "x.csv", content: "foo,bar\n1,2" })).toThrow(
      LeadSourceInputError,
    );
  });

  it("turns limit errors into input errors", () => {
    const tooMany = `NAME\n${Array.from({ length: CSV_MAX_ROWS + 1 }, (_, i) => `B${i}`).join("\n")}`;
    expect(() => importBusinesses({ name: "x.csv", content: tooMany })).toThrow(
      LeadSourceInputError,
    );
  });
});

describe("fixture source", () => {
  it("is deterministic for the same niche + location", async () => {
    const a = await fixtureSource.fetch(
      { niche: "plumbers", location: "Fredericksburg VA", maxResults: 50 },
      { tenantId: "t" },
    );
    const b = fixtureBusinesses({ niche: "Plumbers ", location: "fredericksburg va" });
    expect(a).toHaveLength(FIXTURE_POOL_SIZE);
    expect(a.map((x) => x.kgmid)).toEqual(b.map((x) => x.kgmid));
  });

  it("includes closed businesses and unknown fields so the rules get exercised", () => {
    const list = fixtureBusinesses({ niche: "plumbers", location: "Fredericksburg VA" });
    expect(list.some((b) => b.isPermanentlyClosed)).toBe(true);
    expect(list.some((b) => b.canClaim === null || b.imageCount === null)).toBe(true);
    expect(new Set(list.map((b) => b.kgmid)).size).toBe(list.length);
  });
});

describe("omkar-desktop source", () => {
  it("never hardcodes a port: unset URL means unavailable", async () => {
    expect(readOmkarConfig({}).baseUrl).toBeNull();
    const health = await checkOmkarHealth(readOmkarConfig({}), vi.fn());
    expect(health).toMatchObject({ available: false, contract: "unverified" });
    expect(health.message).toMatch(/OMKAR_DESKTOP_API_URL is not set/);
  });

  it("rejects a FastAPI service answering on the configured port", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("/")
        ? new Response(JSON.stringify({ message: "fastapi-click-api" }), { status: 200 })
        : new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 }),
    );
    const health = await checkOmkarHealth(
      { baseUrl: "http://127.0.0.1:8000", timeoutMs: 100 },
      fetchImpl,
    );
    expect(health).toMatchObject({ available: false, reachable: true, identityConfirmed: false });
  });

  it("confirms a Botasaurus task API but stays disabled (UNVERIFIED)", async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes("/tasks")
        ? new Response(
            JSON.stringify({ count: 0, total_pages: 0, next: null, previous: null, results: [] }),
            { status: 200 },
          )
        : new Response("", { status: 200 }),
    );
    const health = await checkOmkarHealth(
      { baseUrl: "http://127.0.0.1:8123", timeoutMs: 100 },
      fetchImpl,
    );
    expect(health).toMatchObject({
      available: false,
      identityConfirmed: true,
      contract: "unverified",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it("reports unreachable without throwing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const health = await checkOmkarHealth(
      { baseUrl: "http://127.0.0.1:9", timeoutMs: 100 },
      fetchImpl,
    );
    expect(health.message).toMatch(/Source unavailable/);
  });

  it("fetch refuses with an explicit error and never returns data", async () => {
    await expect(
      omkarDesktopSource.fetch({ niche: "a", location: "b", maxResults: 1 }, { tenantId: "t" }),
    ).rejects.toBeInstanceOf(LeadSourceUnavailableError);
  });

  it("identity check", () => {
    expect(looksLikeBotasaurusTaskList({ count: 1, results: [] })).toBe(true);
    expect(looksLikeBotasaurusTaskList({ detail: "Not Found" })).toBe(false);
    expect(looksLikeBotasaurusTaskList([])).toBe(false);
  });
});
