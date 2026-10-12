import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDismissHumanNudge } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDismissHumanNudge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/nudges/human-nudges", () => ({ dismissHumanNudge: mockDismissHumanNudge }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const PARAMS = { params: Promise.resolve({ nudgeId: "33333333-3333-4333-8333-333333333333" }) };

describe("POST /api/crm/nudges/[nudgeId]/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dismisses a nudge", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockDismissHumanNudge.mockResolvedValue({ id: "nudge-1", status: "dismissed" });

    const response = await POST(
      new NextRequest("http://localhost/api/crm/nudges/nudge-1/dismiss"),
      PARAMS,
    );

    expect(response.status).toBe(200);
    expect(mockDismissHumanNudge).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
  });
});
