import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateUnresponsiveLeadNudges } from "../unresponsive-lead";

const mockSelect = vi.fn();
const mockCreateHumanNudge = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/lib/nudges/human-nudges", () => ({
  createHumanNudge: (...args: unknown[]) => mockCreateHumanNudge(...args),
}));

function createChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "leftJoin", "where", "orderBy", "limit"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const outreachContactId = "11111111-1111-4111-8111-111111111111";
const crmContactId = "22222222-2222-4222-8222-222222222222";

const candidate = {
  outreachContactId,
  crmContactId,
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  company: "Acme",
  phone: "+15555550123",
  status: "active",
  optOut: false,
  unsubscribedAt: null,
  repliedAt: null,
  currentStep: 2,
  email1SentAt: "2026-05-01T00:00:00.000Z",
  email2SentAt: "2026-05-20T00:00:00.000Z",
  email3SentAt: null,
  campaignName: "May outreach",
};

describe("generateUnresponsiveLeadNudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a monthly unresponsive-lead nudge after silence", async () => {
    mockSelect.mockReturnValueOnce(createChain([candidate])).mockReturnValueOnce(createChain([]));
    mockCreateHumanNudge.mockResolvedValue({ id: "nudge-1" });

    const result = await generateUnresponsiveLeadNudges({
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(result).toEqual({ scanned: 1, created: 1, skipped: 0 });
    expect(mockCreateHumanNudge).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: crmContactId,
        nudgeType: "unresponsive",
        suggestedAction: "text",
        dedupKey: "outreach-contact:11111111-1111-4111-8111-111111111111:unresponsive:2026-05",
        metadata: expect.objectContaining({
          reason: "unresponsive_lead",
          days_silent: 8,
          last_outbound_at: "2026-05-20T00:00:00.000Z",
        }),
      }),
    );
  });

  it("skips candidates with an existing monthly nudge", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([candidate]))
      .mockReturnValueOnce(createChain([{ id: "existing-nudge" }]));

    const result = await generateUnresponsiveLeadNudges({
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(result).toEqual({ scanned: 1, created: 0, skipped: 1 });
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });

  it("skips opted-out contacts", async () => {
    mockSelect.mockReturnValueOnce(createChain([{ ...candidate, optOut: true }]));

    const result = await generateUnresponsiveLeadNudges({
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(result).toEqual({ scanned: 1, created: 0, skipped: 1 });
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });
});
