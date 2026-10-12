import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateFlow, mockListFlows, mockRequireTenant } = vi.hoisted(() => ({
  mockCreateFlow: vi.fn(),
  mockListFlows: vi.fn(),
  mockRequireTenant: vi.fn(),
}));

vi.mock("@/lib/automation/flows", () => ({
  createAutomationFlow: mockCreateFlow,
  listAutomationFlows: mockListFlows,
}));
vi.mock("../../_lib", () => ({
  parseJson: async (request: Request) => ({ ok: true, data: await request.json() }),
  requireAutomationTenant: mockRequireTenant,
  validationError: (error: unknown) => Response.json({ error }, { status: 400 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET, POST } from "../route";

const tenantAuth = {
  ok: true as const,
  userId: "admin-1",
  tenant: { tenantId: "tenant-1", role: "admin" },
};

function request(method = "GET", body?: unknown) {
  return new NextRequest("http://localhost/api/automation/flows", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("tenant-scoped automation flow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireTenant.mockResolvedValue(tenantAuth);
  });

  it("lists only through the resolved tenant scope", async () => {
    mockListFlows.mockResolvedValue([]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mockListFlows).toHaveBeenCalledWith("tenant-1");
  });

  it("blocks creation when active tenant resolution fails", async () => {
    mockRequireTenant.mockResolvedValue(
      Response.json({ error: "Tenant required" }, { status: 409 }),
    );

    const response = await POST(
      request("POST", { name: "Blocked", triggerType: "manual_enrollment" }),
    );

    expect(response.status).toBe(409);
    expect(mockCreateFlow).not.toHaveBeenCalled();
  });

  it("creates a flow with explicit resolved ownership", async () => {
    mockCreateFlow.mockResolvedValue({ id: "flow-1", tenantId: "tenant-1" });

    const response = await POST(
      request("POST", { name: "Owned", triggerType: "manual_enrollment" }),
    );

    expect(response.status).toBe(201);
    expect(mockRequireTenant).toHaveBeenCalledWith(expect.any(Request), true);
    expect(mockCreateFlow).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Owned" }),
      "admin-1",
      "tenant-1",
    );
  });
});
