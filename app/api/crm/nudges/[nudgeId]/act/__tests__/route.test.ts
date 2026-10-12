import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockMarkHumanNudgeActed } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockMarkHumanNudgeActed: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/nudges/human-nudges", () => ({ markHumanNudgeActed: mockMarkHumanNudgeActed }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const PARAMS = { params: Promise.resolve({ nudgeId: "33333333-3333-4333-8333-333333333333" }) };

describe("POST /api/crm/nudges/[nudgeId]/act", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a nudge acted", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockMarkHumanNudgeActed.mockResolvedValue({ id: "nudge-1", status: "acted" });

    const response = await POST(
      new NextRequest("http://localhost/api/crm/nudges/nudge-1/act"),
      PARAMS,
    );

    expect(response.status).toBe(200);
    expect(mockMarkHumanNudgeActed).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
  });
});
