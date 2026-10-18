/**
 * Live searches through the omkar Google Maps Extractor desktop app's local task API.
 *
 * The task input below was read on 2026-10-13 from the installed app (v4.263.0) and matches a
 * task the owner ran in the app's own UI (recorded in its local task database):
 *   POST /tasks/create-task-async  { scraper_name: "google_maps_scraper", data: {...} }
 *   data = { business_types: ["Restaurant"], search_method: "city", countries: ["US"],
 *            states: [], cities: ["US__CALIFORNIA__CUPERTINO"], extraction_method: "detailed",
 *            max_results, enable_* : false, ... }
 * The app splits that into one child task per business type and city.
 *
 * Still UNVERIFIED until a live test search: the create-task response shape, the results route
 * (POST /tasks/{id}/results), and whether free-text business types and multi-word city IDs are
 * accepted. Everything here is off unless OMKAR_LIVE_SCANS=on, and nothing in this file guesses
 * or fills in data: a response it does not recognise is an error, never an empty success.
 */
import { normalizeRecord, resolveColumns } from "../normalize";
import {
  LeadSourceInputError,
  type LeadSourceQuery,
  LeadSourceUnavailableError,
  type NormalizedBusiness,
} from "../types";

export type OmkarFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface OmkarLiveConfig {
  baseUrl: string;
  /** Per HTTP request. */
  timeoutMs: number;
  /** Whole search, including the app's own scraping time. */
  taskTimeoutMs: number;
  pollIntervalMs: number;
}

const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const STATE_BY_NAME = new Map(
  Object.values(US_STATES).map((name) => [name.toLowerCase(), name] as const),
);

function idPart(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The app's city id for a US location typed as "Fredericksburg VA", "Fredericksburg, VA" or
 * "Fredericksburg, Virginia" (format seen: US__CALIFORNIA__CUPERTINO). Null when the text is
 * not a US city and state.
 */
export function omkarCityId(location: string): string | null {
  const text = location.trim().replace(/\s+/g, " ");
  if (!text || text.length > 120) return null;
  const match = text.match(/^(.+?)(?:,\s*|\s+)([A-Za-z]{2}|[A-Za-z][A-Za-z .]+)$/);
  if (!match) return null;
  const [, rawCity = "", rawState = ""] = match;
  const state =
    rawState.length === 2
      ? US_STATES[rawState.toUpperCase()]
      : STATE_BY_NAME.get(rawState.trim().toLowerCase());
  const city = idPart(rawCity.replace(/,$/, ""));
  if (!state || !city) return null;
  return `US__${idPart(state)}__${city}`;
}

/** "plumbers" → "Plumbers": the app's categories are capitalised ("Restaurant"). */
export function omkarBusinessType(niche: string): string | null {
  const text = niche.trim().replace(/\s+/g, " ");
  if (!text || text.length > 80) return null;
  return text.replace(/(^|\s)\S/g, (start) => start.toUpperCase());
}

/** The exact task body sent to the app. Paid enrichment and extras are always off. */
export function buildOmkarTask(query: LeadSourceQuery) {
  const businessType = omkarBusinessType(query.niche);
  if (!businessType) throw new LeadSourceInputError("Enter what kind of business to search for");
  const cityId = omkarCityId(query.location);
  if (!cityId) {
    throw new LeadSourceInputError(
      'For omkar scans, enter the location as a US city and state, for example "Fredericksburg VA"',
    );
  }
  return {
    scraper_name: "google_maps_scraper",
    data: {
      business_types: [businessType],
      search_method: "city",
      countries: ["US"],
      states: [],
      cities: [cityId],
      randomize_cities: false,
      include_places_outside_city: false,
      extraction_method: "detailed",
      lang: null,
      max_results: query.maxResults,
      enable_reviews_extraction: false,
      enable_photos_extraction: false,
      enable_website_contacts: false,
      enable_leads: false,
    },
  };
}

type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "aborted";
const STATUSES = new Set<string>(["pending", "in_progress", "completed", "failed", "aborted"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function call(
  fetchImpl: OmkarFetch,
  config: OmkarLiveConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; signal?: AbortSignal },
): Promise<unknown> {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: "error",
      signal,
    });
  } catch {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      "Could not reach the omkar Google Maps Extractor. Is the app open?",
    );
  }
  const text = await response.text();
  if (!response.ok) {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      `The omkar app refused the request (HTTP ${response.status}).`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      "The omkar app sent an unreadable reply.",
    );
  }
}

/** The created task's id from the create-task response (a task, or a list of tasks). */
export function createdTaskId(body: unknown): number | null {
  const task = Array.isArray(body) ? body[0] : body;
  const id = record(task)?.id;
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
}

/** The result rows from a results response: `{ results: [...] }` or a plain array. */
export function resultRows(body: unknown): Record<string, unknown>[] | null {
  const rows = Array.isArray(body) ? body : record(body)?.results;
  if (!Array.isArray(rows)) return null;
  return rows.filter((row): row is Record<string, unknown> => record(row) !== null);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/** Runs one search in the app and returns its businesses, normalized like an omkar export. */
export async function runOmkarSearch(
  query: LeadSourceQuery,
  config: OmkarLiveConfig,
  options: { fetchImpl?: OmkarFetch; signal?: AbortSignal; now?: () => number } = {},
): Promise<NormalizedBusiness[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const task = buildOmkarTask(query);
  const created = await call(fetchImpl, config, "/tasks/create-task-async", {
    method: "POST",
    body: task,
    signal: options.signal,
  });
  const taskId = createdTaskId(created);
  if (!taskId) {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      "The omkar app did not return a task id. Its API may have changed (UNVERIFIED).",
    );
  }

  const deadline = now() + config.taskTimeoutMs;
  let status: TaskStatus = "pending";
  while (status === "pending" || status === "in_progress") {
    if (now() > deadline) {
      throw new LeadSourceUnavailableError(
        "omkar-desktop",
        `The omkar search (task ${taskId}) did not finish in time. Check it in the omkar app.`,
      );
    }
    await sleep(config.pollIntervalMs, options.signal);
    const body = record(
      await call(fetchImpl, config, `/tasks/${taskId}`, { method: "GET", signal: options.signal }),
    );
    const next = body?.status;
    if (typeof next !== "string" || !STATUSES.has(next)) {
      throw new LeadSourceUnavailableError(
        "omkar-desktop",
        "The omkar app reported an unknown task status. Its API may have changed (UNVERIFIED).",
      );
    }
    status = next as TaskStatus;
  }
  if (status !== "completed") {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      `The omkar search ${status === "failed" ? "failed" : "was stopped"} (task ${taskId}).`,
    );
  }

  const results = await call(fetchImpl, config, `/tasks/${taskId}/results`, {
    method: "POST",
    body: { page: 1, per_page: Math.max(query.maxResults, 1) },
    signal: options.signal,
  });
  const rows = resultRows(results);
  if (!rows) {
    throw new LeadSourceUnavailableError(
      "omkar-desktop",
      "The omkar app returned results in an unexpected shape. Its API may have changed (UNVERIFIED).",
    );
  }
  const businesses: NormalizedBusiness[] = [];
  for (const row of rows.slice(0, query.maxResults)) {
    const business = normalizeRecord(row, resolveColumns(Object.keys(row)));
    if (business) businesses.push(business);
  }
  return businesses;
}
