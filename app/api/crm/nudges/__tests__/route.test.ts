import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockCreateHumanNudge, mockListHumanNudges } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreateHumanNudge: vi.fn(),
  mockListHumanNudges: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/nudges/human-nudges", () => ({
  createHumanNudge: mockCreateHumanNudge,
  listHumanNudges: mockListHumanNudges,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const USER_SESSION = { user: { id: "user-1", email: "user@example.com", role: "user" } };

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/crm/nudges");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString());
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/crm/nudges", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/crm/nudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockAuth.mockResolvedValue(USER_SESSION);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(403);
  });

  it("lists nudges with filters", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockListHumanNudges.mockResolvedValue({ nudges: [], total: 0, page: 1, limit: 20 });

    const response = await GET(makeGetRequest({ status: "pending", due: "due" }));

    expect(response.status).toBe(200);
    expect(mockListHumanNudges).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", due: "due" }),
    );
  });

  it("rejects invalid list filters", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await GET(makeGetRequest({ status: "done" }));

    expect(response.status).toBe(400);
    expect(mockListHumanNudges).not.toHaveBeenCalled();
  });

  it("creates a nudge with the admin user as creator", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCreateHumanNudge.mockResolvedValue({ id: "nudge-1" });

    const response = await POST(
      makePostRequest({
        nudgeType: "manual",
        title: "Call Jane",
        message: "Jane needs a follow-up.",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.nudge.id).toBe("nudge-1");
    expect(mockCreateHumanNudge).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "admin-1" }),
    );
  });

  it("rejects invalid create payloads", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await POST(makePostRequest({ title: "Missing fields" }));

    expect(response.status).toBe(400);
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });
});
