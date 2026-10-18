import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDb, mockDelete, mockSet, mockValues } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDb: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  mockDelete: vi.fn(),
  mockSet: vi.fn(),
  mockValues: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/storage", () => ({ deleteFile: mockDelete, uploadFile: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { POST as saveProfile } from "../settings/route";
import { POST as saveSite } from "../site-settings/route";
import { DELETE as deleteAvatar } from "../upload/avatar/route";
import { DELETE as deleteLogo } from "../upload/logo/route";

function storedReferences(avatarUrl: string, logoUrl = avatarUrl) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ avatarUrl, logoUrl }]),
      }),
    }),
  });
}

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin media ownership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mockDelete.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockValues.mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) });
    mockDb.update.mockReturnValue({ set: mockSet });
    mockDb.insert.mockReturnValue({ values: mockValues });
  });

  it("does not let profile settings assign an avatar reference", async () => {
    const response = await saveProfile(
      request("settings", {
        avatarUrl: "tenants/another-tenant/report.pdf",
        profileSettings: { firstName: "Admin" },
      }),
    );
    expect(response.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ name: "Admin" }));
    expect(mockSet.mock.calls[0]?.[0]).not.toHaveProperty("avatarUrl");
  });

  it("does not let site settings assign a logo reference", async () => {
    const response = await saveSite(
      request("site-settings", {
        logoUrl: "tenants/another-tenant/report.pdf",
        businessName: "Agency",
      }),
    );
    expect(response.status).toBe(200);
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Agency" }));
    expect(mockValues.mock.calls[0]?.[0]).not.toHaveProperty("logoUrl");
  });

  it.each([
    "tenants/another-tenant/report.pdf",
    "/api/media/avatars/admin-2--1700000000000-0123456789abcdef.png",
    "/api/media/avatars/1700000000000-0123456789abcdef.png",
  ])("detaches an untrusted avatar without deleting storage: %s", async (url) => {
    storedReferences(url);
    expect((await deleteAvatar()).status).toBe(200);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null }));
  });

  it("deletes the current user's server-issued avatar", async () => {
    const key = "avatars/admin-1--1700000000000-0123456789abcdef.png";
    storedReferences(`/api/media/${key}`);
    expect((await deleteAvatar()).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith(key);
  });

  it("detaches an untrusted logo without deleting storage", async () => {
    storedReferences("tenants/another-tenant/report.pdf");
    expect((await deleteLogo()).status).toBe(200);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ logoUrl: null }));
  });

  it("deletes a server-issued logo from the dedicated namespace", async () => {
    const key = "logos/site-default--1700000000000-0123456789abcdef.svg";
    storedReferences(`/api/media/${key}`);
    expect((await deleteLogo()).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith(key);
  });

  it("rejects unauthenticated cleanup", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await deleteAvatar()).status).toBe(401);
    expect((await deleteLogo()).status).toBe(401);
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
