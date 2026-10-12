import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDbSelect, mockDbDelete } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbDelete: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockDbSelect, delete: mockDbDelete } }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/security/input-validation", () => ({
  escapeForPostgresLike: vi.fn((value: string) => value),
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => col),
  eq: vi.fn((col, value) => ({ col, value })),
  ilike: vi.fn((col, value) => ({ col, value })),
  or: vi.fn((...args) => args),
  sql: vi.fn(() => "sql"),
}));
vi.mock("@/lib/db/schema", () => ({
  outreachBlocklist: {
    id: "id",
    email: "email",
    reason: "reason",
    createdAt: "createdAt",
  },
}));

import { DELETE, GET } from "../route";

const ADMIN_SESSION = { user: { id: "admin-1", email: "admin@example.com", role: "admin" } };

function makeRequest(url = "http://localhost/api/outreach/blocklist") {
  return new NextRequest(url);
}

function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "where", "orderBy", "limit", "offset", "returning"]) {
    chain[method] = vi.fn(() => chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return chain;
}

describe("/api/outreach/blocklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without an admin session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("lists blocklist entries", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockDbSelect
      .mockReturnValueOnce(
        makeChain([
          { id: "b1", email: "blocked@example.com", reason: "manual", createdAt: "2024-01-01" },
        ]),
      )
      .mockReturnValueOnce(makeChain([{ count: 1 }]));

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.entries[0]).toEqual({
      id: "b1",
      email: "blocked@example.com",
      reason: "manual",
      created_at: "2024-01-01",
    });
  });

  it("removes a blocklist entry by id", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockDbDelete.mockReturnValue(makeChain([{ id: "b1" }]));

    const response = await DELETE(makeRequest("http://localhost/api/outreach/blocklist?id=b1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
