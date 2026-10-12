export const CLOUDFLARE_SINGLE_REDIRECT_PHASE = "http_request_dynamic_redirect" as const;

export const CLOUDFLARE_ENV_VARS = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_ZONE_NAME",
  "CLOUDFLARE_ORIGIN_PROVIDER",
  "CLOUDFLARE_ORIGIN_TARGET",
  "CLOUDFLARE_RAILWAY_TARGET",
] as const;

export type CloudflareEnvVarName = (typeof CLOUDFLARE_ENV_VARS)[number];

export type CloudflareHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type CloudflareResult<T> =
  | {
      ok: true;
      data: T;
      messages: CloudflareApiMessage[];
      meta: CloudflareResponseMeta;
    }
  | {
      ok: false;
      error: CloudflareClientError;
      meta?: CloudflareResponseMeta;
    };

export interface CloudflareApiMessage {
  code?: number | string;
  message: string;
  documentation_url?: string;
  source?: {
    pointer?: string;
  };
}

export interface CloudflareResultInfo {
  count?: number;
  page?: number;
  per_page?: number;
  total_count?: number;
  total_pages?: number;
  cursors?: {
    after?: string;
  };
}

export interface CloudflareResponseMeta {
  method: CloudflareHttpMethod;
  path: string;
  status: number;
  elapsedMs: number;
  cfRay?: string;
  resultInfo?: CloudflareResultInfo;
}

export type CloudflareClientErrorKind =
  | "configuration"
  | "network"
  | "http"
  | "api"
  | "invalid_response";

export interface CloudflareClientError {
  kind: CloudflareClientErrorKind;
  message: string;
  method?: CloudflareHttpMethod;
  path?: string;
  status?: number;
  code?: number | string;
  missingEnv?: CloudflareEnvVarName[];
  errors?: CloudflareApiMessage[];
  messages?: CloudflareApiMessage[];
}

export type CloudflareOriginProvider = "manual" | "railway" | "vercel";

export interface CloudflareOriginConfig {
  provider: CloudflareOriginProvider;
  target: string | null;
  label: string;
  isConfigured: boolean;
  apex: {
    type: "A" | "CNAME";
    content: string | null;
    proxied: boolean;
  };
  subdomain: {
    type: "CNAME";
    content: string | null;
    proxied: boolean;
  };
  webhook: {
    type: "CNAME";
    content: string | null;
    proxied: false;
  };
}

export interface CloudflareConfigStatus {
  configured: boolean;
  apiConfigured: boolean;
  projectConfigured: boolean;
  env: Record<CloudflareEnvVarName, boolean>;
  missing: CloudflareEnvVarName[];
  zoneName: string | null;
  selectedZoneName: string | null;
  origin: CloudflareOriginConfig;
  railwayTarget: string | null;
}

export interface CloudflareZoneSummary {
  name: string;
  status?: string;
  type?: string;
  accountName?: string;
}

export interface CloudflareCredentialStatus {
  account: {
    id: string;
    name: string;
    type?: string;
  };
  zone: {
    id: string;
    name: string;
    status?: string;
    type?: string;
    accountName?: string;
  };
  zoneNameMatchesEnv: boolean | null;
}

export type CloudflareDnsRecordType = "A" | "CNAME" | "TXT" | "MX";

export type CloudflareTtl = 1 | number;

export interface CloudflareDnsRecordBaseInput {
  type: CloudflareDnsRecordType;
  name: string;
  content: string;
  ttl?: CloudflareTtl;
  comment?: string;
  tags?: string[];
}

export interface CloudflareDnsRecordSettingsInput {
  ipv4Only?: boolean;
  ipv6Only?: boolean;
}

export interface CloudflareARecordInput extends CloudflareDnsRecordBaseInput {
  type: "A";
  proxied?: boolean;
  privateRouting?: boolean;
  settings?: CloudflareDnsRecordSettingsInput;
}

export interface CloudflareCnameRecordInput extends CloudflareDnsRecordBaseInput {
  type: "CNAME";
  proxied?: boolean;
  settings?: CloudflareDnsRecordSettingsInput & {
    flattenCname?: boolean;
  };
}

export interface CloudflareTxtRecordInput extends CloudflareDnsRecordBaseInput {
  type: "TXT";
}

export interface CloudflareMxRecordInput extends CloudflareDnsRecordBaseInput {
  type: "MX";
  priority: number;
}

export type CloudflareDnsRecordInput =
  | CloudflareARecordInput
  | CloudflareCnameRecordInput
  | CloudflareTxtRecordInput
  | CloudflareMxRecordInput;

export interface CloudflareTextFilter {
  exact?: string;
  contains?: string;
  startswith?: string;
  endswith?: string;
}

export interface CloudflareDnsRecordListOptions {
  type?: CloudflareDnsRecordType;
  name?: string | CloudflareTextFilter;
  content?: string | CloudflareTextFilter;
  proxied?: boolean;
  match?: "any" | "all";
  order?: "type" | "name" | "content" | "ttl" | "proxied";
  direction?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface CloudflareDnsRecord {
  id: string;
  type: CloudflareDnsRecordType | string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  proxiable?: boolean;
  comment?: string;
  tags?: string[];
  created_on?: string;
  modified_on?: string;
  comment_modified_on?: string;
  tags_modified_on?: string;
  meta?: unknown;
  settings?: unknown;
}

export interface CloudflareZoneSetting<TValue = unknown> {
  id: string;
  value?: TValue;
  editable?: boolean;
  modified_on?: string;
  time_remaining?: number | boolean;
}

export type CloudflareZoneSettingUpdate = { value: unknown } | { enabled: boolean };

export type CloudflareSingleRedirectStatusCode = 301 | 302 | 303 | 307 | 308;

export type CloudflareSingleRedirectTargetUrl =
  | { value: string; expression?: never }
  | { expression: string; value?: never };

export interface CloudflareSingleRedirectRuleInput {
  expression: string;
  targetUrl: CloudflareSingleRedirectTargetUrl;
  statusCode: CloudflareSingleRedirectStatusCode;
  description?: string;
  ref?: string;
  enabled?: boolean;
  preserveQueryString?: boolean;
}

export interface CloudflareSingleRedirectRulesetInput {
  name?: string;
  description?: string;
  rules: CloudflareSingleRedirectRuleInput[];
}

export interface CloudflareRedirectRule {
  id?: string;
  ref?: string;
  version?: string;
  action: "redirect";
  action_parameters?: {
    from_value?: {
      target_url?: CloudflareSingleRedirectTargetUrl;
      status_code?: CloudflareSingleRedirectStatusCode;
      preserve_query_string?: boolean;
    };
  };
  expression?: string;
  description?: string;
  enabled?: boolean;
  last_updated?: string;
}

export interface CloudflareRuleset {
  id: string;
  name: string;
  kind: "zone" | "root" | "managed" | "custom" | string;
  phase: typeof CLOUDFLARE_SINGLE_REDIRECT_PHASE | string;
  version: string;
  description?: string;
  last_updated?: string;
  rules: CloudflareRedirectRule[];
}

export interface CloudflareCustomHostnameListOptions {
  id?: string;
  hostnameContains?: string;
  hostnameStatus?: string;
  sslStatus?: string;
  wildcard?: boolean;
  page?: number;
  perPage?: number;
  direction?: "asc" | "desc";
}

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status?: string;
  created_at?: string;
  custom_metadata?: Record<string, unknown>;
  custom_origin_server?: string;
  custom_origin_sni?: string;
  ownership_verification?: {
    name?: string;
    type?: "txt" | string;
    value?: string;
  };
  ownership_verification_http?: {
    http_body?: string;
    http_url?: string;
  };
  ssl?: {
    id?: string;
    status?: string;
    method?: "http" | "txt" | "email" | string;
    type?: "dv" | string;
    wildcard?: boolean;
    certificate_authority?: string;
    settings?: Record<string, unknown>;
    validation_errors?: Array<{ message?: string }>;
    validation_records?: Array<Record<string, unknown>>;
  };
  verification_errors?: string[];
}

export interface CloudflareEmailRoutingSettings {
  id: string;
  enabled: boolean;
  name: string;
  status?:
    | "ready"
    | "unconfigured"
    | "misconfigured"
    | "misconfigured/locked"
    | "unlocked"
    | string;
  created?: string;
  modified?: string;
  skip_wizard?: boolean;
  tag?: string;
}

export interface CloudflareEmailDestinationAddressListOptions {
  verified?: boolean;
  direction?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface CloudflareEmailDestinationAddress {
  id?: string;
  email?: string;
  verified?: string | null;
  created?: string;
  modified?: string;
  tag?: string;
}

export type CloudflareEmailRoutingAction =
  | {
      type: "forward";
      value: string[];
    }
  | {
      type: "drop";
      value?: string[];
    }
  | {
      type: "worker";
      value: string[];
    };

export type CloudflareEmailRoutingMatcher =
  | {
      type: "literal";
      field: "to";
      value: string;
    }
  | {
      type: "all";
      field?: "to";
      value?: string;
    };

export interface CloudflareEmailRoutingRuleInput {
  actions: CloudflareEmailRoutingAction[];
  matchers: CloudflareEmailRoutingMatcher[];
  enabled?: boolean;
  name?: string;
  priority?: number;
}

export interface CloudflareEmailRoutingRuleListOptions {
  enabled?: boolean;
  page?: number;
  perPage?: number;
}

export interface CloudflareEmailRoutingRule {
  id?: string;
  actions?: CloudflareEmailRoutingAction[];
  matchers?: CloudflareEmailRoutingMatcher[];
  enabled?: boolean;
  name?: string;
  priority?: number;
  tag?: string;
}
