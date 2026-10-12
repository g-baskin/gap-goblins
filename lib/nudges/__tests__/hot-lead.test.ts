import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateHotLeadNudges } from "../hot-lead";

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
  for (const method of ["from", "innerJoin", "leftJoin", "where", "orderBy", "limit"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const contactId = "11111111-1111-4111-8111-111111111111";
const dealId = "22222222-2222-4222-8222-222222222222";

const automationCandidate = {
  contactId,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  company: "Acme",
  contactStatus: "lead",
  tags: ["automation-hot"],
  latestSourceDetail: "high_intent_click",
  lastTouchDate: "2026-05-28T00:00:00.000Z",
  dealId,
  dealName: "Website rebuild",
  signalAt: "2026-05-28T00:00:00.000Z",
  signalSource: "automation",
  signalDetail: "hot",
  engagementScore: 15,
};

const replyCandidate = {
  ...automationCandidate,
  signalAt: "2026-05-27T00:00:00.000Z",
  signalSource: "outreach_reply",
  signalDetail: "schedule_call",
  engagementScore: 10,
};

describe("generateHotLeadNudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates one quarterly hot-lead nudge per contact", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([automationCandidate]))
      .mockReturnValueOnce(createChain([replyCandidate]))
      .mockReturnValueOnce(createChain([]));
    mockCreateHumanNudge.mockResolvedValue({ id: "nudge-1" });

    const result = await generateHotLeadNudges({ now: new Date("2026-05-28T12:00:00.000Z") });

    expect(result).toEqual({ scanned: 2, created: 1, skipped: 0 });
    expect(mockCreateHumanNudge).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId,
        dealId,
        nudgeType: "hot_lead",
        priority: "high",
        dedupKey: "contact:11111111-1111-4111-8111-111111111111:hot_lead:2026-Q2",
        metadata: expect.objectContaining({ reason: "hot_lead", signal_source: "automation" }),
      }),
    );
  });

  it("skips contacts that already have a quarterly hot-lead nudge", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([automationCandidate]))
      .mockReturnValueOnce(createChain([]))
      .mockReturnValueOnce(createChain([{ id: "existing-nudge" }]));

    const result = await generateHotLeadNudges({ now: new Date("2026-05-28T12:00:00.000Z") });

    expect(result).toEqual({ scanned: 1, created: 0, skipped: 1 });
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });

  it("skips closed contacts", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([{ ...automationCandidate, contactStatus: "customer" }]))
      .mockReturnValueOnce(createChain([]));

    const result = await generateHotLeadNudges({ now: new Date("2026-05-28T12:00:00.000Z") });

    expect(result).toEqual({ scanned: 1, created: 0, skipped: 1 });
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });
});
