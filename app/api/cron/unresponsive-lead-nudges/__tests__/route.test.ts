import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateUnresponsiveLeadNudges } = vi.hoisted(() => ({
  mockGenerateUnresponsiveLeadNudges: vi.fn(),
}));

vi.mock("@/lib/nudges/unresponsive-lead", () => ({
  generateUnresponsiveLeadNudges: mockGenerateUnresponsiveLeadNudges,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET } from "../route";

function makeRequest(token?: string) {
  return new NextRequest("http://localhost/api/cron/unresponsive-lead-nudges", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/cron/unresponsive-lead-nudges", () => {
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
    expect(mockGenerateUnresponsiveLeadNudges).not.toHaveBeenCalled();
  });

  it("generates unresponsive-lead nudges for authorized cron calls", async () => {
    mockGenerateUnresponsiveLeadNudges.mockResolvedValue({ scanned: 2, created: 1, skipped: 1 });

    const response = await GET(makeRequest("test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({ success: true, scanned: 2, created: 1, skipped: 1 }),
    );
    expect(mockGenerateUnresponsiveLeadNudges).toHaveBeenCalledOnce();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeRequest("test-secret"));

    expect(response.status).toBe(500);
    expect(mockGenerateUnresponsiveLeadNudges).not.toHaveBeenCalled();
  });
});
