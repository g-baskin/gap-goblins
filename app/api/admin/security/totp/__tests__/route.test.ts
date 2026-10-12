import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDb, mockCheckRateLimit, mockVerifySync, mockEncryptCredential } = vi.hoisted(
  () => ({
    mockAuth: vi.fn(),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    mockCheckRateLimit: vi.fn(),
    mockVerifySync: vi.fn(),
    mockEncryptCredential: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimiters: { totpSetup: { limit: 5, windowMs: 3600000 } },
}));
vi.mock("@/lib/encryption", () => ({
  decryptCredential: vi.fn(),
  encryptCredential: mockEncryptCredential,
}));
vi.mock("otplib", () => ({
  generateSecret: vi.fn(() => "SECRET"),
  generateURI: vi.fn(() => "otpauth://totp/Admin?secret=SECRET"),
  verifySync: mockVerifySync,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/security/totp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildMockDb({ totpEnabled = false } = {}) {
  mockDb.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ totpEnabled }]),
      }),
    }),
  });
  mockDb.update = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  mockDb.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
}

describe("POST /api/admin/security/totp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4, resetIn: 3600000 });
    mockVerifySync.mockReturnValue({ valid: true });
    mockEncryptCredential.mockReturnValue({ encryptedValue: "ev", iv: "iv", tag: "tag" });
  });

  it("rejects setup when 2FA is already enabled", async () => {
    buildMockDb({ totpEnabled: true });

    const response = await POST(makePostRequest({ secret: "SECRET", token: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("already enabled");
    expect(mockVerifySync).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("enables 2FA when the account does not already have it", async () => {
    buildMockDb({ totpEnabled: false });

    const response = await POST(makePostRequest({ secret: "SECRET", token: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockVerifySync).toHaveBeenCalledWith({ token: "123456", secret: "SECRET" });
    expect(mockDb.update).toHaveBeenCalled();
  });
});
