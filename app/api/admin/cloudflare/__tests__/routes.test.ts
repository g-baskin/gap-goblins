import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockCreateDnsRecord,
  mockCreateEmailDestination,
  mockCreateEmailRule,
  mockCreateRedirectRuleset,
  mockEnableEmailRouting,
  mockGetConfigStatus,
  mockGetCredentialStatus,
  mockListDnsRecords,
  mockListEmailDestinations,
  mockListEmailRules,
  mockListZoneSummaries,
  mockReadEmailRoutingStatus,
  mockReadRedirectRuleset,
  mockUpdateDnsRecord,
  mockUpdateRedirectRuleset,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreateDnsRecord: vi.fn(),
  mockCreateEmailDestination: vi.fn(),
  mockCreateEmailRule: vi.fn(),
  mockCreateRedirectRuleset: vi.fn(),
  mockEnableEmailRouting: vi.fn(),
  mockGetConfigStatus: vi.fn(),
  mockGetCredentialStatus: vi.fn(),
  mockListDnsRecords: vi.fn(),
  mockListEmailDestinations: vi.fn(),
  mockListEmailRules: vi.fn(),
  mockListZoneSummaries: vi.fn(),
  mockReadEmailRoutingStatus: vi.fn(),
  mockReadRedirectRuleset: vi.fn(),
  mockUpdateDnsRecord: vi.fn(),
  mockUpdateRedirectRuleset: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/cloudflare/client", () => ({
  createCloudflareDnsRecord: mockCreateDnsRecord,
  createCloudflareEmailDestinationAddress: mockCreateEmailDestination,
  createCloudflareEmailRoutingRule: mockCreateEmailRule,
  createCloudflareSingleRedirectRuleset: mockCreateRedirectRuleset,
  enableCloudflareEmailRouting: mockEnableEmailRouting,
  getCloudflareConfigStatus: mockGetConfigStatus,
  getCloudflareCredentialStatus: mockGetCredentialStatus,
  listCloudflareDnsRecords: mockListDnsRecords,
  listCloudflareEmailDestinationAddresses: mockListEmailDestinations,
  listCloudflareEmailRoutingRules: mockListEmailRules,
  listCloudflareZoneSummaries: mockListZoneSummaries,
  readCloudflareEmailRoutingStatus: mockReadEmailRoutingStatus,
  readCloudflareSingleRedirectRuleset: mockReadRedirectRuleset,
  updateCloudflareDnsRecord: mockUpdateDnsRecord,
  updateCloudflareSingleRedirectRuleset: mockUpdateRedirectRuleset,
}));

import { GET as GET_DNS, POST as POST_DNS } from "../dns/records/route";
import {
  GET as GET_EMAIL_DESTINATIONS,
  POST as POST_EMAIL_DESTINATIONS,
} from "../email/destinations/route";
import { POST as POST_EMAIL_ENABLE } from "../email/routing/enable/route";
import { GET as GET_EMAIL_RULES, POST as POST_EMAIL_RULES } from "../email/rules/route";
import { GET as GET_REDIRECTS, POST as POST_REDIRECTS } from "../redirects/route";
import { GET as GET_STATUS } from "../status/route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const SUPER_ADMIN_SESSION = {
  user: { id: "super-1", email: "super@example.com", role: "super_admin" },
};

const successMeta = {
  method: "GET" as const,
  path: "/zones/zone/dns_records",
  status: 200,
  elapsedMs: 12,
};

function okResult<TData>(data: TData) {
  return { ok: true as const, data, messages: [], meta: successMeta };
}

function request(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function seedCloudflareMocks() {
  mockGetConfigStatus.mockReturnValue({
    configured: true,
    apiConfigured: true,
    projectConfigured: true,
    env: {
      CLOUDFLARE_API_TOKEN: true,
      CLOUDFLARE_ACCOUNT_ID: true,
      CLOUDFLARE_ZONE_ID: true,
      CLOUDFLARE_ZONE_NAME: true,
      CLOUDFLARE_ORIGIN_PROVIDER: true,
      CLOUDFLARE_ORIGIN_TARGET: true,
      CLOUDFLARE_RAILWAY_TARGET: true,
    },
    missing: [],
    zoneName: "example.com",
    selectedZoneName: "example.com",
    origin: {
      provider: "manual",
      target: "website.up.railway.app",
      label: "Manual origin",
      isConfigured: true,
      apex: { type: "CNAME", content: "website.up.railway.app", proxied: true },
      subdomain: { type: "CNAME", content: "website.up.railway.app", proxied: true },
      webhook: { type: "CNAME", content: "website.up.railway.app", proxied: false },
    },
    railwayTarget: "website.up.railway.app",
  });
  mockListZoneSummaries.mockResolvedValue(
    okResult([
      { name: "example.com", status: "active", type: "full", accountName: "Example Account" },
      { name: "client.com", status: "active", type: "full", accountName: "Example Account" },
    ]),
  );
  mockGetCredentialStatus.mockResolvedValue(
    okResult({
      account: { id: "account-secret-id", name: "Example Account", type: "standard" },
      zone: {
        id: "zone-secret-id",
        name: "example.com",
        status: "active",
        type: "full",
        accountName: "Example Account",
      },
      zoneNameMatchesEnv: true,
    }),
  );
  mockReadEmailRoutingStatus.mockResolvedValue(
    okResult({ id: "routing", name: "example.com", enabled: true, status: "ready" }),
  );
  mockListDnsRecords.mockResolvedValue(
    okResult([
      {
        id: "apex",
        type: "CNAME",
        name: "example.com",
        content: "website.up.railway.app",
        ttl: 1,
        proxied: true,
      },
      {
        id: "www",
        type: "CNAME",
        name: "www.example.com",
        content: "website.up.railway.app",
        ttl: 1,
        proxied: true,
      },
      {
        id: "hooks",
        type: "CNAME",
        name: "hooks.example.com",
        content: "website.up.railway.app",
        ttl: 1,
        proxied: false,
      },
      {
        id: "verify",
        type: "TXT",
        name: "_railway-verify.example.com",
        content: "railway-verify=abc123",
        ttl: 1,
      },
    ]),
  );
  mockReadRedirectRuleset.mockResolvedValue(okResult({ id: "ruleset", rules: [] }));
  mockListEmailDestinations.mockResolvedValue(okResult([{ id: "dest", email: "ops@example.com" }]));
  mockListEmailRules.mockResolvedValue(okResult([{ id: "rule", enabled: true }]));
  mockCreateDnsRecord.mockResolvedValue(okResult({ id: "new-record" }));
  mockUpdateDnsRecord.mockResolvedValue(okResult({ id: "updated-record" }));
  mockCreateRedirectRuleset.mockResolvedValue(okResult({ id: "created-ruleset" }));
  mockUpdateRedirectRuleset.mockResolvedValue(okResult({ id: "updated-ruleset" }));
  mockCreateEmailDestination.mockResolvedValue(okResult({ id: "new-dest" }));
  mockCreateEmailRule.mockResolvedValue(okResult({ id: "new-rule" }));
  mockEnableEmailRouting.mockResolvedValue(okResult({ id: "routing", enabled: true }));
}

describe("Cloudflare admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedCloudflareMocks();
  });

  it("requires authentication for read routes", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET_DNS(request("http://localhost/api/admin/cloudflare/dns/records"));

    expect(response.status).toBe(401);
    expect(mockListDnsRecords).not.toHaveBeenCalled();
  });

  it("allows authenticated admins to read Cloudflare resources", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await GET_EMAIL_DESTINATIONS(
      request("http://localhost/api/admin/cloudflare/email/destinations?verified=true"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.destinations).toEqual([{ id: "dest", email: "ops@example.com" }]);
    expect(mockListEmailDestinations).toHaveBeenCalledWith({ verified: true });
  });

  it("requires super_admin for DNS mutations", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await POST_DNS(
      request("http://localhost/api/admin/cloudflare/dns/records", {
        record: { type: "CNAME", name: "test", content: "example.com", proxied: true },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("super admins");
    expect(mockCreateDnsRecord).not.toHaveBeenCalled();
  });

  it("validates DNS mutation bodies before calling Cloudflare", async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION);

    const response = await POST_DNS(
      request("http://localhost/api/admin/cloudflare/dns/records", {
        record: { type: "MX", name: "example.com", content: "mail.example.com" },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockCreateDnsRecord).not.toHaveBeenCalled();
  });

  it("creates DNS records only on explicit super_admin POST", async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION);

    const response = await POST_DNS(
      request("http://localhost/api/admin/cloudflare/dns/records", {
        record: { type: "CNAME", name: "app", content: "website.up.railway.app", proxied: true },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record).toEqual({ id: "new-record" });
    expect(mockCreateDnsRecord).toHaveBeenCalledWith(
      {
        type: "CNAME",
        name: "app",
        content: "website.up.railway.app",
        proxied: true,
      },
      { zoneName: undefined },
    );
  });

  it("returns diagnostics without leaking Cloudflare account or zone IDs", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await GET_STATUS(request("http://localhost/api/admin/cloudflare/status"));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(serialized).not.toContain("account-secret-id");
    expect(serialized).not.toContain("zone-secret-id");
    expect(body.credentials.data.account.name).toBe("Example Account");
    expect(body.diagnostics.domainMapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "apex", status: "ok", expectedProxied: true }),
        expect.objectContaining({ key: "www", status: "ok", expectedProxied: true }),
        expect.objectContaining({ key: "hooks", status: "ok", expectedProxied: false }),
      ]),
    );
    expect(body.diagnostics.railwayVerificationTxtRecords).toEqual([
      expect.objectContaining({ name: "_railway-verify.example.com" }),
    ]);
  });

  it("parses false boolean query filters without turning them on", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await GET_EMAIL_RULES(
      request("http://localhost/api/admin/cloudflare/email/rules?enabled=false"),
    );

    expect(response.status).toBe(200);
    expect(mockListEmailRules).toHaveBeenCalledWith({ enabled: false }, { zoneName: undefined });
  });

  it("returns an empty redirects table when no Single Redirect ruleset exists", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockReadRedirectRuleset.mockResolvedValue(
      okResult({
        id: "",
        name: "Single Redirect ruleset",
        kind: "zone",
        phase: "http_request_dynamic_redirect",
        version: "",
        rules: [],
      }),
    );

    const response = await GET_REDIRECTS(
      request("http://localhost/api/admin/cloudflare/redirects?zoneName=gregorybaskin.com"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ruleset.rules).toEqual([]);
  });

  it("reports Vercel origin DNS expectations when configured", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockGetConfigStatus.mockReturnValue({
      configured: true,
      apiConfigured: true,
      projectConfigured: true,
      env: {
        CLOUDFLARE_API_TOKEN: true,
        CLOUDFLARE_ACCOUNT_ID: true,
        CLOUDFLARE_ZONE_ID: true,
        CLOUDFLARE_ZONE_NAME: true,
        CLOUDFLARE_ORIGIN_PROVIDER: true,
        CLOUDFLARE_ORIGIN_TARGET: false,
        CLOUDFLARE_RAILWAY_TARGET: false,
      },
      missing: [],
      zoneName: "example.com",
      selectedZoneName: "example.com",
      origin: {
        provider: "vercel",
        target: "cname.vercel-dns.com",
        label: "Vercel",
        isConfigured: true,
        apex: { type: "A", content: "76.76.21.21", proxied: true },
        subdomain: { type: "CNAME", content: "cname.vercel-dns.com", proxied: true },
        webhook: { type: "CNAME", content: "cname.vercel-dns.com", proxied: false },
      },
      railwayTarget: null,
    });
    mockListDnsRecords.mockResolvedValue(okResult([]));

    const response = await GET_STATUS(request("http://localhost/api/admin/cloudflare/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.diagnostics.origin.provider).toBe("vercel");
    expect(body.diagnostics.domainMapping).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "apex", expectedType: "A", expectedContent: "76.76.21.21" }),
        expect.objectContaining({
          key: "www",
          expectedType: "CNAME",
          expectedContent: "cname.vercel-dns.com",
        }),
      ]),
    );
  });

  it("passes selected domain names to zone-scoped Cloudflare calls", async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION);

    const statusResponse = await GET_STATUS(
      request("http://localhost/api/admin/cloudflare/status?zoneName=client.com"),
    );
    const dnsResponse = await POST_DNS(
      request("http://localhost/api/admin/cloudflare/dns/records?zoneName=client.com", {
        record: { type: "CNAME", name: "app", content: "website.up.railway.app", proxied: true },
      }),
    );
    const redirectResponse = await POST_REDIRECTS(
      request("http://localhost/api/admin/cloudflare/redirects?zoneName=client.com", {
        ruleset: {
          rules: [
            {
              expression: 'http.host eq "www.client.com"',
              targetUrl: { value: "https://client.com" },
              statusCode: 301,
            },
          ],
        },
      }),
    );

    expect(statusResponse.status).toBe(200);
    expect(dnsResponse.status).toBe(200);
    expect(redirectResponse.status).toBe(200);
    expect(mockGetConfigStatus).toHaveBeenCalledWith({ zoneName: "client.com" });
    expect(mockGetCredentialStatus).toHaveBeenCalledWith({ zoneName: "client.com" });
    expect(mockListDnsRecords).toHaveBeenCalledWith({ perPage: 100 }, { zoneName: "client.com" });
    expect(mockCreateDnsRecord).toHaveBeenCalledWith(
      { type: "CNAME", name: "app", content: "website.up.railway.app", proxied: true },
      { zoneName: "client.com" },
    );
    expect(mockUpdateRedirectRuleset).toHaveBeenCalledWith(
      expect.objectContaining({ rules: expect.any(Array) }),
      { zoneName: "client.com" },
    );
  });

  it("supports redirects, email rules, destinations, and email routing enable endpoints", async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION);

    const redirectsGet = await GET_REDIRECTS(
      request("http://localhost/api/admin/cloudflare/redirects?zoneName=client.com"),
    );
    const redirectsPost = await POST_REDIRECTS(
      request("http://localhost/api/admin/cloudflare/redirects", {
        ruleset: {
          rules: [
            {
              expression: 'http.host eq "www.example.com"',
              targetUrl: { value: "https://example.com" },
              statusCode: 301,
            },
          ],
        },
      }),
    );
    const rulesGet = await GET_EMAIL_RULES(
      request("http://localhost/api/admin/cloudflare/email/rules?enabled=true"),
    );
    const rulesPost = await POST_EMAIL_RULES(
      request("http://localhost/api/admin/cloudflare/email/rules", {
        actions: [{ type: "forward", value: ["ops@example.com"] }],
        matchers: [{ type: "literal", field: "to", value: "hello@example.com" }],
      }),
    );
    const destinationsPost = await POST_EMAIL_DESTINATIONS(
      request("http://localhost/api/admin/cloudflare/email/destinations", {
        email: "ops@example.com",
      }),
    );
    const enablePost = await POST_EMAIL_ENABLE(
      request("http://localhost/api/admin/cloudflare/email/routing/enable", {}),
    );

    expect(redirectsGet.status).toBe(200);
    expect(redirectsPost.status).toBe(200);
    expect(rulesGet.status).toBe(200);
    expect(rulesPost.status).toBe(200);
    expect(destinationsPost.status).toBe(200);
    expect(enablePost.status).toBe(200);
    expect(mockUpdateRedirectRuleset).toHaveBeenCalledOnce();
    expect(mockCreateEmailRule).toHaveBeenCalledWith(
      expect.objectContaining({ actions: expect.any(Array), matchers: expect.any(Array) }),
      {},
    );
    expect(mockCreateEmailDestination).toHaveBeenCalledWith("ops@example.com");
    expect(mockEnableEmailRouting).toHaveBeenCalledWith({});
  });
});
