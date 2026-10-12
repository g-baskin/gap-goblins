import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateHotLeadNudges } = vi.hoisted(() => ({
  mockGenerateHotLeadNudges: vi.fn(),
}));

vi.mock("@/lib/nudges/hot-lead", () => ({
  generateHotLeadNudges: mockGenerateHotLeadNudges,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET } from "../route";

function makeRequest(token?: string) {
  return new NextRequest("http://localhost/api/cron/hot-lead-nudges", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/cron/hot-lead-nudges", () => {
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
    expect(mockGenerateHotLeadNudges).not.toHaveBeenCalled();
  });

  it("generates hot-lead nudges for authorized cron calls", async () => {
    mockGenerateHotLeadNudges.mockResolvedValue({ scanned: 2, created: 1, skipped: 1 });

    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({ success: true, scanned: 2, created: 1, skipped: 1 }),
    );
    expect(mockGenerateHotLeadNudges).toHaveBeenCalledOnce();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(mockGenerateHotLeadNudges).not.toHaveBeenCalled();
  });
});
