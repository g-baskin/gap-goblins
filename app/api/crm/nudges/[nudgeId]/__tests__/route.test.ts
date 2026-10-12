import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockGetHumanNudge, mockUpdateHumanNudge } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetHumanNudge: vi.fn(),
  mockUpdateHumanNudge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/nudges/human-nudges", () => ({
  getHumanNudge: mockGetHumanNudge,
  updateHumanNudge: mockUpdateHumanNudge,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET, PATCH } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const PARAMS = { params: Promise.resolve({ nudgeId: "33333333-3333-4333-8333-333333333333" }) };

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/crm/nudges/33333333-3333-4333-8333-333333333333", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/crm/nudges/[nudgeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a nudge detail", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockGetHumanNudge.mockResolvedValue({ id: "nudge-1" });

    const response = await GET(new NextRequest("http://localhost/api/crm/nudges/nudge-1"), PARAMS);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nudge.id).toBe("nudge-1");
  });

  it("updates allowed fields", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockUpdateHumanNudge.mockResolvedValue({ id: "nudge-1", status: "dismissed" });

    const response = await PATCH(makePatchRequest({ status: "dismissed" }), PARAMS);

    expect(response.status).toBe(200);
    expect(mockUpdateHumanNudge).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333", {
      status: "dismissed",
    });
  });

  it("rejects empty updates", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await PATCH(makePatchRequest({}), PARAMS);

    expect(response.status).toBe(400);
    expect(mockUpdateHumanNudge).not.toHaveBeenCalled();
  });
});
