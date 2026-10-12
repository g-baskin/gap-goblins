import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockDbSelect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockDbSelect } }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/db/schema", () => ({
  newsletterSettings: "newsletter_settings",
}));

import { GET } from "../route";

function makeRequest(url = "http://localhost/api/newsletter/settings") {
  return new NextRequest(url);
}

function mockSettingsRow(row: unknown | null) {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(row ? [row] : []),
    }),
  });
}

describe("GET /api/newsletter/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth for full settings", async () => {
    mockAuth.mockResolvedValue(null);
    mockSettingsRow(null);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("allows public mode without exposing sender settings", async () => {
    mockAuth.mockResolvedValue(null);
    mockSettingsRow({
      branding: { formTitle: "Custom title", buttonText: "Join" },
      sender: {
        name: "Private Sender",
        email: "private@example.com",
        replyTo: "reply@example.com",
      },
      template: "curated-brief",
      footer: { companyName: "Acme", address: "Perth", unsubscribeText: "Unsubscribe" },
    });

    const response = await GET(makeRequest("http://localhost/api/newsletter/settings?public=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.branding.formTitle).toBe("Custom title");
    expect(body.branding.buttonText).toBe("Join");
    expect(body.footer.companyName).toBe("Acme");
    expect(body.sender).toBeUndefined();
    expect(body.template).toBeUndefined();
  });
});
