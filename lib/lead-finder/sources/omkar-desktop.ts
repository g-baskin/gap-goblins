/**
 * omkar-desktop lead source: the omkarcloud Google Maps Extractor desktop app's
 * built-in local API (Botasaurus Desktop API), called with plain fetch.
 *
 * Status: live scanning is OFF unless OMKAR_LIVE_SCANS=on, and UNVERIFIED until a live test
 * search confirms the task API (see omkar-live.ts for what is and is not verified yet).
 * - The HTTP routes are documented in the official client source
 *   (https://github.com/omkarcloud/botasaurus/blob/master/js/botasaurus-desktop-api/src/index.ts):
 *   GET / (health), GET /tasks (paginated list), POST /tasks/create-task-async,
 *   GET /tasks/{id}, POST /tasks/{id}/results.
 * - The Google Maps scraper's `scraper_name` and its input keys are only shown
 *   inside the app's "API Integration" tab, not in public docs. Sending a guess
 *   could start a paid search with the wrong input, so fetch() refuses with an
 *   explicit error instead of returning anything.
 *
 * The health check never starts a search. It reads OMKAR_DESKTOP_API_URL
 * (never assumes localhost:8000: on the owner's machine another service,
 * fastapi-click-api, holds 127.0.0.1:8000) and confirms the server answers
 * like a Botasaurus task API before reporting it reachable.
 */
import { type LeadSource, type LeadSourceHealth, LeadSourceUnavailableError } from "../types";
import { runOmkarSearch } from "./omkar-live";

export const OMKAR_UNVERIFIED_MESSAGE =
  "omkar desktop live scanning is off (UNVERIFIED until a confirmed test search; the owner turns it on " +
  "with OMKAR_LIVE_SCANS=on). Export your results from the omkar app and use CSV import instead.";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OmkarConfig {
  baseUrl: string | null;
  timeoutMs: number;
  /** OMKAR_LIVE_SCANS=on: the owner's switch for running real searches through the app. */
  liveScans?: boolean;
  /** Longest a whole search may take (OMKAR_TASK_TIMEOUT_MS, default 15 minutes). */
  taskTimeoutMs?: number;
}

export function readOmkarConfig(
  env: Record<string, string | undefined> = process.env,
): OmkarConfig {
  const raw = env.OMKAR_DESKTOP_API_URL?.trim();
  const timeout = Number.parseInt(env.OMKAR_DESKTOP_TIMEOUT_MS ?? "", 10);
  const taskTimeout = Number.parseInt(env.OMKAR_TASK_TIMEOUT_MS ?? "", 10);
  return {
    baseUrl: raw ? raw.replace(/\/+$/, "") : null,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? Math.min(timeout, 60_000) : 10_000,
    liveScans: env.OMKAR_LIVE_SCANS?.trim().toLowerCase() === "on",
    taskTimeoutMs:
      Number.isFinite(taskTimeout) && taskTimeout > 0
        ? Math.min(taskTimeout, 60 * 60_000)
        : 15 * 60_000,
  };
}

async function getJson(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
    const textBody = await response.text();
    let body: unknown = textBody;
    try {
      body = JSON.parse(textBody);
    } catch {
      // Non-JSON body; keep the text.
    }
    return { status: response.status, body, headers: response.headers };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A Botasaurus task list is a paginated object with `count` and a `results`
 * array (per the official client). FastAPI services answer unknown routes with
 * `{"detail":"Not Found"}`, which fails this check.
 */
export function looksLikeBotasaurusTaskList(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  if ("detail" in record && Object.keys(record).length === 1) return false;
  return typeof record.count === "number" && Array.isArray(record.results);
}

export async function checkOmkarHealth(
  config: OmkarConfig = readOmkarConfig(),
  fetchImpl: FetchLike = fetch,
): Promise<LeadSourceHealth & { reachable: boolean; identityConfirmed: boolean }> {
  if (!config.baseUrl) {
    return {
      available: false,
      reachable: false,
      identityConfirmed: false,
      contract: "unverified",
      message: "Source unavailable: OMKAR_DESKTOP_API_URL is not set.",
    };
  }
  try {
    const root = await getJson(fetchImpl, `${config.baseUrl}/`, config.timeoutMs);
    if (root.status !== 200) {
      return {
        available: false,
        reachable: true,
        identityConfirmed: false,
        contract: "unverified",
        message: `Source unavailable: ${config.baseUrl} answered HTTP ${root.status}.`,
      };
    }
    const tasks = await getJson(
      fetchImpl,
      `${config.baseUrl}/tasks?page=1&per_page=1`,
      config.timeoutMs,
    );
    const identityConfirmed = tasks.status === 200 && looksLikeBotasaurusTaskList(tasks.body);
    if (!identityConfirmed) {
      return {
        available: false,
        reachable: true,
        identityConfirmed: false,
        contract: "unverified",
        message:
          `Source unavailable: ${config.baseUrl} is reachable but does not look like the omkar desktop API ` +
          "(GET /tasks did not return a Botasaurus task list). Check OMKAR_DESKTOP_API_URL.",
      };
    }
    if (config.liveScans) {
      return {
        available: true,
        reachable: true,
        identityConfirmed: true,
        contract: "unverified",
        message:
          `omkar desktop API found at ${config.baseUrl}. Live scans are ON (OMKAR_LIVE_SCANS=on) ` +
          "and UNVERIFIED until a test search is confirmed. Each scan uses your omkar search quota.",
      };
    }
    return {
      available: false,
      reachable: true,
      identityConfirmed: true,
      contract: "unverified",
      message: `omkar desktop API found at ${config.baseUrl}, but ${OMKAR_UNVERIFIED_MESSAGE}`,
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timed out after ${config.timeoutMs} ms`
        : "connection failed";
    return {
      available: false,
      reachable: false,
      identityConfirmed: false,
      contract: "unverified",
      message: `Source unavailable: omkar desktop API at ${config.baseUrl} ${reason}. Is the app open?`,
    };
  }
}

export const omkarDesktopSource: LeadSource = {
  id: "omkar-desktop",
  label: "omkar Google Maps Extractor (desktop app) — UNVERIFIED",
  async health() {
    const { available, contract, message } = await checkOmkarHealth();
    return { available, contract, message };
  },
  async fetch(query, context) {
    const config = readOmkarConfig();
    if (!config.liveScans || !config.baseUrl) {
      throw new LeadSourceUnavailableError("omkar-desktop", OMKAR_UNVERIFIED_MESSAGE);
    }
    return runOmkarSearch(
      query,
      {
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
        taskTimeoutMs: config.taskTimeoutMs ?? 15 * 60_000,
        pollIntervalMs: 5000,
      },
      { signal: context.signal },
    );
  },
};
