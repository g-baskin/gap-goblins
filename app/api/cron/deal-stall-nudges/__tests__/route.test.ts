import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateDealStallNudges } = vi.hoisted(() => ({
  mockGenerateDealStallNudges: vi.fn(),
}));

vi.mock("@/lib/nudges/deal-stall", () => ({
  generateDealStallNudges: mockGenerateDealStallNudges,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET } from "../route";

function makeRequest(token?: string) {
  return new NextRequest("http://localhost/api/cron/deal-stall-nudges", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/cron/deal-stall-nudges", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects missing cron auth", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockGenerateDealStallNudges).not.toHaveBeenCalled();
  });

  it("generates deal-stall nudges for authorized cron calls", async () => {
    mockGenerateDealStallNudges.mockResolvedValue({
      scanned: 2,
      created: 2,
      skipped: 0,
      stalled: { scanned: 1, created: 1, skipped: 0 },
      overdue: { scanned: 1, created: 1, skipped: 0 },
    });

    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({ success: true, scanned: 2, created: 2, skipped: 0 }),
    );
    expect(mockGenerateDealStallNudges).toHaveBeenCalledOnce();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(mockGenerateDealStallNudges).not.toHaveBeenCalled();
  });
});
