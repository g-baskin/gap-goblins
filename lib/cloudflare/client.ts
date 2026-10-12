import "server-only";

import { logger } from "@/lib/logger";
import {
  CLOUDFLARE_ENV_VARS,
  CLOUDFLARE_SINGLE_REDIRECT_PHASE,
  type CloudflareApiMessage,
  type CloudflareClientError,
  type CloudflareConfigStatus,
  type CloudflareCredentialStatus,
  type CloudflareCustomHostname,
  type CloudflareCustomHostnameListOptions,
  type CloudflareDnsRecord,
  type CloudflareDnsRecordInput,
  type CloudflareDnsRecordListOptions,
  type CloudflareEmailDestinationAddress,
  type CloudflareEmailDestinationAddressListOptions,
  type CloudflareEmailRoutingRule,
  type CloudflareEmailRoutingRuleInput,
  type CloudflareEmailRoutingRuleListOptions,
  type CloudflareEmailRoutingSettings,
  type CloudflareEnvVarName,
  type CloudflareHttpMethod,
  type CloudflareOriginConfig,
  type CloudflareOriginProvider,
  type CloudflareResponseMeta,
  type CloudflareResult,
  type CloudflareResultInfo,
  type CloudflareRuleset,
  type CloudflareSingleRedirectRulesetInput,
  type CloudflareTextFilter,
  type CloudflareZoneSetting,
  type CloudflareZoneSettingUpdate,
  type CloudflareZoneSummary,
} from "./types";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const DEFAULT_PER_PAGE = 100;

interface CloudflareApiResponse<T> {
  success?: boolean;
  errors?: CloudflareApiMessage[];
  messages?: CloudflareApiMessage[];
  result?: T;
  result_info?: CloudflareResultInfo;
}

interface CloudflareRequestOptions {
  method: CloudflareHttpMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  requiredEnv?: CloudflareEnvVarName[];
}

interface CloudflareAccountDetails {
  id: string;
  name: string;
  type?: string;
}

interface CloudflareZoneDetails {
  id: string;
  name: string;
  status?: string;
  type?: string;
  account?: {
    id?: string;
    name?: string;
  };
}

interface CloudflareZoneRequestOptions {
  zoneName?: string;
}

function readEnv(name: CloudflareEnvVarName): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getMissingEnv(requiredEnv: CloudflareEnvVarName[]): CloudflareEnvVarName[] {
  return requiredEnv.filter((name) => !readEnv(name));
}

function normalizeOriginProvider(value: string | undefined): CloudflareOriginProvider {
  if (value === "manual" || value === "railway" || value === "vercel") return value;
  return "manual";
}

function getCloudflareOriginConfig(): CloudflareOriginConfig {
  const provider = normalizeOriginProvider(readEnv("CLOUDFLARE_ORIGIN_PROVIDER"));
  const genericTarget = readEnv("CLOUDFLARE_ORIGIN_TARGET");
  const railwayTarget = readEnv("CLOUDFLARE_RAILWAY_TARGET");
  const target = genericTarget ?? (provider === "railway" ? railwayTarget : undefined) ?? null;

  if (provider === "vercel") {
    return {
      provider,
      target: target ?? "cname.vercel-dns.com",
      label: "Vercel",
      isConfigured: true,
      apex: { type: "A", content: "76.76.21.21", proxied: true },
      subdomain: { type: "CNAME", content: target ?? "cname.vercel-dns.com", proxied: true },
      webhook: { type: "CNAME", content: target ?? "cname.vercel-dns.com", proxied: false },
    };
  }

  return {
    provider,
    target,
    label: provider === "railway" ? "Railway" : "Manual origin",
    isConfigured: Boolean(target),
    apex: { type: "CNAME", content: target, proxied: true },
    subdomain: { type: "CNAME", content: target, proxied: true },
    webhook: { type: "CNAME", content: target, proxied: false },
  };
}

function configurationError(missingEnv: CloudflareEnvVarName[]): CloudflareClientError {
  return {
    kind: "configuration",
    message: `Cloudflare is not configured. Missing: ${missingEnv.join(", ")}`,
    missingEnv,
  };
}

function apiErrorToMessage(errors: CloudflareApiMessage[] | undefined, fallback: string): string {
  const firstError = errors?.find((error) => error.message);
  return firstError?.message ?? fallback;
}

function isMissingRulesetError(error: CloudflareClientError): boolean {
  return error.errors?.some((message) => message.code === 10003) ?? false;
}

function emptyRedirectRuleset(): CloudflareRuleset {
  return {
    id: "",
    name: "Single Redirect ruleset",
    kind: "zone",
    phase: CLOUDFLARE_SINGLE_REDIRECT_PHASE,
    version: "",
    description: "No Single Redirect ruleset exists yet.",
    rules: [],
  };
}

function normalizeErrorMessages(messages: unknown): CloudflareApiMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => {
      if (typeof message === "string") return { message } satisfies CloudflareApiMessage;
      if (!message || typeof message !== "object") return null;

      const record = message as Record<string, unknown>;
      const normalized: CloudflareApiMessage = {
        message: typeof record.message === "string" ? record.message : "Cloudflare API message",
      };

      if (typeof record.code === "number" || typeof record.code === "string") {
        normalized.code = record.code;
      }
      if (typeof record.documentation_url === "string") {
        normalized.documentation_url = record.documentation_url;
      }
      if (record.source && typeof record.source === "object") {
        const source = record.source as Record<string, unknown>;
        if (typeof source.pointer === "string") {
          normalized.source = { pointer: source.pointer };
        }
      }

      return normalized;
    })
    .filter((message): message is CloudflareApiMessage => message !== null);
}

function isCloudflareApiResponse<T>(value: unknown): value is CloudflareApiResponse<T> {
  if (!value || typeof value !== "object") return false;

  return "success" in value || "errors" in value || "messages" in value || "result" in value;
}

function toQueryKey(key: string): string {
  if (key === "perPage") return "per_page";
  if (key === "tagMatch") return "tag_match";
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function appendQueryParam(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryParam(params, key, item);
    }
    return;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    for (const [nestedKey, nestedValue] of entries) {
      appendQueryParam(params, `${key}.${toQueryKey(nestedKey)}`, nestedValue);
    }
    return;
  }

  params.append(key, String(value));
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(`${CLOUDFLARE_API_BASE_URL}${path}`);

  if (query) {
    const entries = Object.entries(query).sort(([a], [b]) => a.localeCompare(b));
    for (const [key, value] of entries) {
      appendQueryParam(url.searchParams, toQueryKey(key), value);
    }
  }

  return url.toString();
}

function dnsTextFilter(
  value: string | CloudflareTextFilter | undefined,
): CloudflareTextFilter | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return { exact: value };
  return value;
}

function dnsListQuery(
  options: CloudflareDnsRecordListOptions | undefined,
): Record<string, unknown> {
  return {
    type: options?.type,
    name: dnsTextFilter(options?.name),
    content: dnsTextFilter(options?.content),
    proxied: options?.proxied,
    match: options?.match,
    order: options?.order,
    direction: options?.direction,
    page: options?.page,
    perPage: options?.perPage ?? DEFAULT_PER_PAGE,
  };
}

function normalizeDnsRecordBody(input: CloudflareDnsRecordInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: input.type,
    name: input.name,
    content: input.content,
    ttl: input.ttl ?? 1,
    comment: input.comment,
    tags: input.tags,
  };

  if (input.type === "A") {
    body.proxied = input.proxied;
    body.private_routing = input.privateRouting;
    if (input.settings) {
      body.settings = {
        ipv4_only: input.settings.ipv4Only,
        ipv6_only: input.settings.ipv6Only,
      };
    }
  }

  if (input.type === "CNAME") {
    body.proxied = input.proxied;
    if (input.settings) {
      body.settings = {
        flatten_cname: input.settings.flattenCname,
        ipv4_only: input.settings.ipv4Only,
        ipv6_only: input.settings.ipv6Only,
      };
    }
  }

  if (input.type === "MX") {
    body.priority = input.priority;
  }

  return pruneUndefined(body);
}

function normalizeRedirectRulesetBody(
  input: CloudflareSingleRedirectRulesetInput,
): Record<string, unknown> {
  return pruneUndefined({
    name: input.name ?? "Single Redirect ruleset",
    description: input.description,
    kind: "zone",
    phase: CLOUDFLARE_SINGLE_REDIRECT_PHASE,
    rules: input.rules.map((rule) =>
      pruneUndefined({
        ref: rule.ref,
        expression: rule.expression,
        description: rule.description,
        enabled: rule.enabled,
        action: "redirect",
        action_parameters: {
          from_value: pruneUndefined({
            target_url: rule.targetUrl,
            status_code: rule.statusCode,
            preserve_query_string: rule.preserveQueryString,
          }),
        },
      }),
    ),
  });
}

function emailAddressListQuery(
  options: CloudflareEmailDestinationAddressListOptions | undefined,
): Record<string, unknown> {
  return {
    verified: options?.verified,
    direction: options?.direction,
    page: options?.page,
    perPage: options?.perPage ?? DEFAULT_PER_PAGE,
  };
}

function emailRoutingRuleListQuery(
  options: CloudflareEmailRoutingRuleListOptions | undefined,
): Record<string, unknown> {
  return {
    enabled: options?.enabled,
    page: options?.page,
    perPage: options?.perPage ?? DEFAULT_PER_PAGE,
  };
}

function customHostnameListQuery(
  options: CloudflareCustomHostnameListOptions | undefined,
): Record<string, unknown> {
  return {
    id: options?.id,
    hostname: options?.hostnameContains ? { contain: options.hostnameContains } : undefined,
    hostnameStatus: options?.hostnameStatus,
    sslStatus: options?.sslStatus,
    wildcard: options?.wildcard,
    page: options?.page,
    perPage: options?.perPage ?? DEFAULT_PER_PAGE,
    direction: options?.direction,
  };
}

function zoneListQuery(): Record<string, unknown> {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID");

  return {
    account: accountId ? { id: accountId } : undefined,
    order: "name",
    direction: "asc",
    perPage: DEFAULT_PER_PAGE,
  };
}

function normalizeZoneName(zoneName: string | undefined): string | undefined {
  const normalized = zoneName?.trim().toLowerCase().replace(/\.$/, "");
  return normalized || undefined;
}

function toZoneSummary(zone: CloudflareZoneDetails): CloudflareZoneSummary {
  return {
    name: zone.name,
    status: zone.status,
    type: zone.type,
    accountName: zone.account?.name,
  };
}

async function resolveCloudflareZone(options?: CloudflareZoneRequestOptions): Promise<
  | {
      ok: true;
      zone: CloudflareZoneDetails;
      meta: CloudflareResponseMeta;
      messages: CloudflareApiMessage[];
    }
  | { ok: false; error: CloudflareClientError; meta?: CloudflareResponseMeta }
> {
  const selectedZoneName =
    normalizeZoneName(options?.zoneName) ?? normalizeZoneName(readEnv("CLOUDFLARE_ZONE_NAME"));
  const envZoneId = readEnv("CLOUDFLARE_ZONE_ID");

  if (!selectedZoneName) {
    if (!envZoneId) {
      return { ok: false, error: configurationError(["CLOUDFLARE_ZONE_ID"]) };
    }

    const zoneResult = await cloudflareRequest<CloudflareZoneDetails>({
      method: "GET",
      path: `/zones/${envZoneId}`,
      requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
    });

    if (!zoneResult.ok) return zoneResult;
    return {
      ok: true,
      zone: zoneResult.data,
      meta: zoneResult.meta,
      messages: zoneResult.messages,
    };
  }

  const zonesResult = await listCloudflareZones();
  if (!zonesResult.ok) return zonesResult;

  const zone = zonesResult.data.find((item) => normalizeZoneName(item.name) === selectedZoneName);
  if (!zone) {
    return {
      ok: false,
      error: {
        kind: "configuration",
        message: `Cloudflare zone not found for ${selectedZoneName}.`,
      },
      meta: zonesResult.meta,
    };
  }

  return { ok: true, zone, meta: zonesResult.meta, messages: zonesResult.messages };
}

async function resolveCloudflareZoneId(options?: CloudflareZoneRequestOptions): Promise<
  | {
      ok: true;
      zoneId: string;
      zoneName: string;
      meta: CloudflareResponseMeta;
      messages: CloudflareApiMessage[];
    }
  | { ok: false; error: CloudflareClientError; meta?: CloudflareResponseMeta }
> {
  const zoneResult = await resolveCloudflareZone(options);
  if (!zoneResult.ok) return zoneResult;

  return {
    ok: true,
    zoneId: zoneResult.zone.id,
    zoneName: zoneResult.zone.name,
    meta: zoneResult.meta,
    messages: zoneResult.messages,
  };
}

function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as T;
  }

  if (!value || typeof value !== "object") return value;

  const entries = Object.entries(value).flatMap(([key, entryValue]) => {
    if (entryValue === undefined) return [];
    return [[key, pruneUndefined(entryValue)] as const];
  });

  return Object.fromEntries(entries) as T;
}

async function cloudflareRequest<T>(
  options: CloudflareRequestOptions,
): Promise<CloudflareResult<T>> {
  const requiredEnv = options.requiredEnv ?? ["CLOUDFLARE_API_TOKEN"];
  const missingEnv = getMissingEnv(requiredEnv);
  if (missingEnv.length > 0) {
    return { ok: false, error: configurationError(missingEnv) };
  }

  const token = readEnv("CLOUDFLARE_API_TOKEN");
  if (!token) {
    return { ok: false, error: configurationError(["CLOUDFLARE_API_TOKEN"]) };
  }

  const startedAt = performance.now();
  const url = buildUrl(options.path, options.query);
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  });

  const init: RequestInit = {
    method: options.method,
    headers,
    cache: "no-store",
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, init);
    const elapsedMs = Math.round(performance.now() - startedAt);
    const cfRay = response.headers.get("cf-ray") ?? undefined;
    const metaBase: CloudflareResponseMeta = {
      method: options.method,
      path: options.path,
      status: response.status,
      elapsedMs,
      cfRay,
    };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      const error: CloudflareClientError = {
        kind: "invalid_response",
        message: "Cloudflare returned a non-JSON response.",
        method: options.method,
        path: options.path,
        status: response.status,
      };
      logger
        .withContext({ service: "cloudflare", method: options.method, path: options.path })
        .warn("Invalid Cloudflare response", { status: response.status, elapsedMs, cfRay });
      return { ok: false, error, meta: metaBase };
    }

    if (!isCloudflareApiResponse<T>(payload)) {
      const error: CloudflareClientError = {
        kind: "invalid_response",
        message: "Cloudflare returned an unexpected response shape.",
        method: options.method,
        path: options.path,
        status: response.status,
      };
      logger
        .withContext({ service: "cloudflare", method: options.method, path: options.path })
        .warn("Unexpected Cloudflare response shape", {
          status: response.status,
          elapsedMs,
          cfRay,
        });
      return { ok: false, error, meta: metaBase };
    }

    const errors = normalizeErrorMessages(payload.errors);
    const messages = normalizeErrorMessages(payload.messages);
    const meta: CloudflareResponseMeta = {
      ...metaBase,
      resultInfo: payload.result_info,
    };

    if (!response.ok) {
      const error: CloudflareClientError = {
        kind: "http",
        message: apiErrorToMessage(
          errors,
          `Cloudflare request failed with HTTP ${response.status}.`,
        ),
        method: options.method,
        path: options.path,
        status: response.status,
        code: errors[0]?.code,
        errors,
        messages,
      };
      logger
        .withContext({ service: "cloudflare", method: options.method, path: options.path })
        .warn("Cloudflare HTTP error", {
          status: response.status,
          elapsedMs,
          cfRay,
          errorCode: error.code,
        });
      return { ok: false, error, meta };
    }

    if (payload.success !== true) {
      const error: CloudflareClientError = {
        kind: "api",
        message: apiErrorToMessage(errors, "Cloudflare API returned success=false."),
        method: options.method,
        path: options.path,
        status: response.status,
        code: errors[0]?.code,
        errors,
        messages,
      };
      logger
        .withContext({ service: "cloudflare", method: options.method, path: options.path })
        .warn("Cloudflare API error", {
          status: response.status,
          elapsedMs,
          cfRay,
          errorCode: error.code,
        });
      return { ok: false, error, meta };
    }

    logger
      .withContext({ service: "cloudflare", method: options.method, path: options.path })
      .info("Cloudflare request completed", { status: response.status, elapsedMs, cfRay });

    return {
      ok: true,
      data: payload.result as T,
      messages,
      meta,
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const clientError: CloudflareClientError = {
      kind: "network",
      message: error instanceof Error ? error.message : "Cloudflare network request failed.",
      method: options.method,
      path: options.path,
    };
    logger
      .withContext({ service: "cloudflare", method: options.method, path: options.path })
      .warn("Cloudflare network error", { elapsedMs });
    return { ok: false, error: clientError };
  }
}

export function getCloudflareConfigStatus(
  options?: CloudflareZoneRequestOptions,
): CloudflareConfigStatus {
  const env = Object.fromEntries(
    CLOUDFLARE_ENV_VARS.map((name) => [name, Boolean(readEnv(name))]),
  ) as Record<CloudflareEnvVarName, boolean>;
  const requiredEnv: CloudflareEnvVarName[] = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
  const missing = requiredEnv.filter((name) => !env[name]);
  const apiConfigured = env.CLOUDFLARE_API_TOKEN;
  const projectConfigured = env.CLOUDFLARE_ACCOUNT_ID;

  return {
    configured: apiConfigured && projectConfigured,
    apiConfigured,
    projectConfigured,
    env,
    missing,
    zoneName: readEnv("CLOUDFLARE_ZONE_NAME") ?? null,
    selectedZoneName:
      normalizeZoneName(options?.zoneName) ?? readEnv("CLOUDFLARE_ZONE_NAME") ?? null,
    origin: getCloudflareOriginConfig(),
    railwayTarget: readEnv("CLOUDFLARE_RAILWAY_TARGET") ?? null,
  };
}

export async function listCloudflareZones(): Promise<CloudflareResult<CloudflareZoneDetails[]>> {
  return cloudflareRequest<CloudflareZoneDetails[]>({
    method: "GET",
    path: "/zones",
    query: zoneListQuery(),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function listCloudflareZoneSummaries(): Promise<
  CloudflareResult<CloudflareZoneSummary[]>
> {
  const result = await listCloudflareZones();
  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.map(toZoneSummary),
    messages: result.messages,
    meta: result.meta,
  };
}

export async function getCloudflareCredentialStatus(
  options?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareCredentialStatus>> {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID") ?? "";

  const [accountResult, zoneResult] = await Promise.all([
    cloudflareRequest<CloudflareAccountDetails>({
      method: "GET",
      path: `/accounts/${accountId}`,
      requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
    }),
    resolveCloudflareZone(options),
  ]);

  if (!accountResult.ok) return accountResult;
  if (!zoneResult.ok) return zoneResult;

  const zoneName = readEnv("CLOUDFLARE_ZONE_NAME");

  return {
    ok: true,
    data: {
      account: accountResult.data,
      zone: {
        id: zoneResult.zone.id,
        name: zoneResult.zone.name,
        status: zoneResult.zone.status,
        type: zoneResult.zone.type,
        accountName: zoneResult.zone.account?.name,
      },
      zoneNameMatchesEnv: zoneName ? zoneResult.zone.name === zoneName : null,
    },
    messages: [...accountResult.messages, ...zoneResult.messages],
    meta: zoneResult.meta,
  };
}

export async function listCloudflareDnsRecords(
  options?: CloudflareDnsRecordListOptions,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareDnsRecord[]>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareDnsRecord[]>({
    method: "GET",
    path: `/zones/${zone.zoneId}/dns_records`,
    query: dnsListQuery(options),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function createCloudflareDnsRecord(
  record: CloudflareDnsRecordInput,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareDnsRecord>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareDnsRecord>({
    method: "POST",
    path: `/zones/${zone.zoneId}/dns_records`,
    body: normalizeDnsRecordBody(record),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function updateCloudflareDnsRecord(
  dnsRecordId: string,
  record: CloudflareDnsRecordInput,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareDnsRecord>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareDnsRecord>({
    method: "PUT",
    path: `/zones/${zone.zoneId}/dns_records/${dnsRecordId}`,
    body: normalizeDnsRecordBody(record),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function readCloudflareZoneSetting<TValue = unknown>(
  settingId: string,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareZoneSetting<TValue>>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareZoneSetting<TValue>>({
    method: "GET",
    path: `/zones/${zone.zoneId}/settings/${settingId}`,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function updateCloudflareZoneSetting<TValue = unknown>(
  settingId: string,
  update: CloudflareZoneSettingUpdate,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareZoneSetting<TValue>>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareZoneSetting<TValue>>({
    method: "PATCH",
    path: `/zones/${zone.zoneId}/settings/${settingId}`,
    body: update,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function readCloudflareSingleRedirectRuleset(
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareRuleset>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  const result = await cloudflareRequest<CloudflareRuleset>({
    method: "GET",
    path: `/zones/${zone.zoneId}/rulesets/phases/${CLOUDFLARE_SINGLE_REDIRECT_PHASE}/entrypoint`,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });

  if (!result.ok && isMissingRulesetError(result.error)) {
    return {
      ok: true,
      data: emptyRedirectRuleset(),
      messages: result.error.errors ?? [],
      meta: result.meta ?? zone.meta,
    };
  }

  return result;
}

export async function createCloudflareSingleRedirectRuleset(
  input: CloudflareSingleRedirectRulesetInput,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareRuleset>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareRuleset>({
    method: "POST",
    path: `/zones/${zone.zoneId}/rulesets`,
    body: normalizeRedirectRulesetBody(input),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function updateCloudflareSingleRedirectRuleset(
  input: CloudflareSingleRedirectRulesetInput,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareRuleset>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareRuleset>({
    method: "PUT",
    path: `/zones/${zone.zoneId}/rulesets/phases/${CLOUDFLARE_SINGLE_REDIRECT_PHASE}/entrypoint`,
    body: normalizeRedirectRulesetBody(input),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function listCloudflareCustomHostnames(
  options?: CloudflareCustomHostnameListOptions,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareCustomHostname[]>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareCustomHostname[]>({
    method: "GET",
    path: `/zones/${zone.zoneId}/custom_hostnames`,
    query: customHostnameListQuery(options),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function readCloudflareCustomHostname(
  customHostnameId: string,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareCustomHostname>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareCustomHostname>({
    method: "GET",
    path: `/zones/${zone.zoneId}/custom_hostnames/${customHostnameId}`,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function readCloudflareEmailRoutingStatus(
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareEmailRoutingSettings>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareEmailRoutingSettings>({
    method: "GET",
    path: `/zones/${zone.zoneId}/email/routing`,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function enableCloudflareEmailRouting(
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareEmailRoutingSettings>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareEmailRoutingSettings>({
    method: "POST",
    path: `/zones/${zone.zoneId}/email/routing/enable`,
    body: {},
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function listCloudflareEmailDestinationAddresses(
  options?: CloudflareEmailDestinationAddressListOptions,
): Promise<CloudflareResult<CloudflareEmailDestinationAddress[]>> {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID") ?? "";
  return cloudflareRequest<CloudflareEmailDestinationAddress[]>({
    method: "GET",
    path: `/accounts/${accountId}/email/routing/addresses`,
    query: emailAddressListQuery(options),
    requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  });
}

export async function createCloudflareEmailDestinationAddress(
  email: string,
): Promise<CloudflareResult<CloudflareEmailDestinationAddress>> {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID") ?? "";
  return cloudflareRequest<CloudflareEmailDestinationAddress>({
    method: "POST",
    path: `/accounts/${accountId}/email/routing/addresses`,
    body: { email },
    requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  });
}

export async function listCloudflareEmailRoutingRules(
  options?: CloudflareEmailRoutingRuleListOptions,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareEmailRoutingRule[]>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareEmailRoutingRule[]>({
    method: "GET",
    path: `/zones/${zone.zoneId}/email/routing/rules`,
    query: emailRoutingRuleListQuery(options),
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}

export async function createCloudflareEmailRoutingRule(
  rule: CloudflareEmailRoutingRuleInput,
  zoneOptions?: CloudflareZoneRequestOptions,
): Promise<CloudflareResult<CloudflareEmailRoutingRule>> {
  const zone = await resolveCloudflareZoneId(zoneOptions);
  if (!zone.ok) return zone;

  return cloudflareRequest<CloudflareEmailRoutingRule>({
    method: "POST",
    path: `/zones/${zone.zoneId}/email/routing/rules`,
    body: rule,
    requiredEnv: ["CLOUDFLARE_API_TOKEN"],
  });
}
