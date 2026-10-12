import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDb, mockCheckRateLimit } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimiters: { login: { limit: 10, windowMs: 900000 } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };

function makeDeleteRequest(url = "http://localhost/api/admin/security/sessions?all=true") {
  return new NextRequest(url, { method: "DELETE" });
}

function buildMockDb() {
  const userUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const userUpdateSet = vi.fn().mockReturnValue({ where: userUpdateWhere });
  const userUpdateBuilder = { set: userUpdateSet };

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const deleteBuilder = { where: deleteWhere };

  mockDb.update = vi.fn().mockReturnValue(userUpdateBuilder);
  mockDb.delete = vi.fn().mockReturnValue(deleteBuilder);
  mockDb.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

  return { userUpdateSet, deleteWhere };
}

describe("DELETE /api/admin/security/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, resetIn: 900000 });
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("requires either a session id or all=true", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await DELETE(
      makeDeleteRequest("http://localhost/api/admin/security/sessions"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Session ID is required");
  });

  it("moves tokensValidFrom forward when revoking all sessions", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    const { userUpdateSet, deleteWhere } = buildMockDb();

    const response = await DELETE(makeDeleteRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(userUpdateSet).toHaveBeenCalledWith({
      tokensValidFrom: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(deleteWhere).toHaveBeenCalled();
  });
});
