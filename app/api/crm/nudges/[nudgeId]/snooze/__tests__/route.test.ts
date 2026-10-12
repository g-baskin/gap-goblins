import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockSnoozeHumanNudge } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSnoozeHumanNudge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/nudges/human-nudges", () => ({ snoozeHumanNudge: mockSnoozeHumanNudge }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };
const PARAMS = { params: Promise.resolve({ nudgeId: "33333333-3333-4333-8333-333333333333" }) };

function makeRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/crm/nudges/33333333-3333-4333-8333-333333333333/snooze",
    { method: "POST", body: JSON.stringify(body) },
  );
}

describe("POST /api/crm/nudges/[nudgeId]/snooze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("snoozes a nudge", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockSnoozeHumanNudge.mockResolvedValue({ id: "nudge-1", status: "snoozed" });

    const response = await POST(makeRequest({ snoozedUntil: "2026-05-30T00:00:00.000Z" }), PARAMS);

    expect(response.status).toBe(200);
    expect(mockSnoozeHumanNudge).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      "2026-05-30T00:00:00.000Z",
    );
  });

  it("rejects invalid snooze payloads", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);

    const response = await POST(makeRequest({ snoozedUntil: "later" }), PARAMS);

    expect(response.status).toBe(400);
    expect(mockSnoozeHumanNudge).not.toHaveBeenCalled();
  });
});
