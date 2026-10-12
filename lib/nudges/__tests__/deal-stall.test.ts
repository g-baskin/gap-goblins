import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateDealStallNudges } from "../deal-stall";

const mockSelect = vi.fn();
const mockCreateHumanNudge = vi.fn();
const mockHumanNudgeDedupExists = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/lib/nudges/human-nudges", () => ({
  createHumanNudge: (...args: unknown[]) => mockCreateHumanNudge(...args),
  humanNudgeDedupExists: (...args: unknown[]) => mockHumanNudgeDedupExists(...args),
}));

function createChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "where", "orderBy", "limit"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const baseDeal = {
  dealId: "22222222-2222-4222-8222-222222222222",
  dealName: "Website rebuild",
  amount: 75000,
  contactId: "11111111-1111-4111-8111-111111111111",
  stageEnteredAt: "2026-05-01T00:00:00.000Z",
  expectedCloseDate: "2026-05-20T00:00:00.000Z",
  stageName: "Proposal Sent",
  contactFirstName: "Jane",
  contactLastName: "Doe",
  contactEmail: "jane@example.com",
};

describe("generateDealStallNudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates weekly stalled and monthly overdue nudges", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([baseDeal]))
      .mockReturnValueOnce(createChain([baseDeal]));
    mockHumanNudgeDedupExists.mockResolvedValue(false);
    mockCreateHumanNudge.mockResolvedValue({ id: "nudge-1" });

    const result = await generateDealStallNudges({
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(result.created).toBe(2);
    expect(mockCreateHumanNudge).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        dealId: baseDeal.dealId,
        nudgeType: "deal_milestone",
        priority: "high",
        dedupKey: "deal:22222222-2222-4222-8222-222222222222:stalled:2026-W22",
        metadata: expect.objectContaining({ reason: "deal_stalled", days_stalled: 27 }),
      }),
    );
    expect(mockCreateHumanNudge).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        dedupKey: "deal:22222222-2222-4222-8222-222222222222:overdue:2026-05",
        metadata: expect.objectContaining({ reason: "deal_overdue", days_overdue: 8 }),
      }),
    );
  });

  it("skips candidates with existing dedupe keys", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([baseDeal]))
      .mockReturnValueOnce(createChain([baseDeal]));
    mockHumanNudgeDedupExists.mockResolvedValue(true);

    const result = await generateDealStallNudges({
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(2);
    expect(mockCreateHumanNudge).not.toHaveBeenCalled();
  });

  it("uses medium priority for lower-value stalled deals", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([{ ...baseDeal, amount: 12000 }]))
      .mockReturnValueOnce(createChain([]));
    mockHumanNudgeDedupExists.mockResolvedValue(false);

    await generateDealStallNudges({ now: new Date("2026-05-28T12:00:00.000Z") });

    expect(mockCreateHumanNudge).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "medium" }),
    );
  });
});
