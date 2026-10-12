import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetFlow, mockStats, mockSteps, mockRequireTenant, mockUpdateFlow } = vi.hoisted(() => ({
  mockGetFlow: vi.fn(),
  mockStats: vi.fn(),
  mockSteps: vi.fn(),
  mockRequireTenant: vi.fn(),
  mockUpdateFlow: vi.fn(),
}));

vi.mock("@/lib/automation/flows", () => ({
  archiveAutomationFlow: vi.fn(),
  getAutomationFlow: mockGetFlow,
  updateAutomationFlow: mockUpdateFlow,
}));
vi.mock("@/lib/automation/stats", () => ({ getAutomationFlowStats: mockStats }));
vi.mock("@/lib/automation/steps", () => ({ listAutomationSteps: mockSteps }));
vi.mock("../../../_lib", () => ({
  parseJson: async (request: Request) => ({ ok: true, data: await request.json() }),
  requireAutomationTenant: mockRequireTenant,
  validationError: (error: unknown) => Response.json({ error }, { status: 400 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET, PATCH } from "../route";

const params = { params: Promise.resolve({ flowId: "flow-b" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTenant.mockResolvedValue({
    ok: true,
    userId: "admin-a",
    tenant: { tenantId: "tenant-a", role: "admin" },
  });
});

describe("tenant-scoped automation flow detail", () => {
  it("passes the active tenant into the data-layer lookup", async () => {
    mockGetFlow.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/automation/flows/flow-b"),
      params,
    );

    expect(response.status).toBe(404);
    expect(mockGetFlow).toHaveBeenCalledWith("flow-b", "tenant-a");
    expect(mockSteps).not.toHaveBeenCalled();
    expect(mockStats).not.toHaveBeenCalled();
  });

  it("fails before lookup when tenant selection is ambiguous", async () => {
    mockRequireTenant.mockResolvedValue(
      Response.json({ error: "Select an active tenant" }, { status: 409 }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/automation/flows/flow-b"),
      params,
    );

    expect(response.status).toBe(409);
    expect(mockGetFlow).not.toHaveBeenCalled();
    expect(mockGetFlow).not.toHaveBeenCalled();
  });

  it("parses and updates a valid request body once", async () => {
    mockUpdateFlow.mockResolvedValue({ id: "flow-b", name: "Updated flow" });
    const request = new NextRequest("http://localhost/api/automation/flows/flow-b", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated flow" }),
    });

    const response = await PATCH(request, params);

    expect(response.status).toBe(200);
    expect(mockUpdateFlow).toHaveBeenCalledWith(
      "flow-b",
      "tenant-a",
      expect.objectContaining({ name: "Updated flow" }),
    );
  });
});
