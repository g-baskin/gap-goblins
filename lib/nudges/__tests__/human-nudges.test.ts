import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrmError } from "@/lib/crm/types";
import {
  createHumanNudge,
  dismissHumanNudge,
  listHumanNudges,
  markHumanNudgeActed,
  snoozeHumanNudge,
} from "../human-nudges";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

function createChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "from",
    "where",
    "limit",
    "offset",
    "orderBy",
    "leftJoin",
    "values",
    "returning",
    "set",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const contactId = "11111111-1111-4111-8111-111111111111";
const dealId = "22222222-2222-4222-8222-222222222222";
const nudgeId = "33333333-3333-4333-8333-333333333333";

function makeNudge(overrides: Record<string, unknown> = {}) {
  return {
    id: nudgeId,
    contactId,
    dealId: null,
    nudgeType: "manual",
    title: "Call Jane",
    message: "Jane needs a follow-up.",
    suggestedAction: "call",
    priority: "medium",
    dueDate: "2026-05-29T00:00:00.000Z",
    status: "pending",
    snoozedUntil: null,
    deliveredVia: null,
    deliveredAt: null,
    actedAt: null,
    dismissedAt: null,
    assignedToUserId: null,
    dedupKey: "manual:jane",
    metadata: {},
    createdBy: null,
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z",
    ...overrides,
  };
}

describe("human nudges service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists nudges with pagination", async () => {
    const listChain = createChain([
      {
        ...makeNudge(),
        contactFirstName: "Jane",
        contactLastName: "Doe",
        contactEmail: "jane@example.com",
        dealName: null,
      },
    ]);
    const countChain = createChain([{ count: 1 }]);
    mockSelect.mockReturnValueOnce(listChain).mockReturnValueOnce(countChain);

    const result = await listHumanNudges({ page: 2, limit: 10, status: "pending" });

    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.nudges[0]).toEqual(expect.objectContaining({ title: "Call Jane" }));
    expect(listChain.offset).toHaveBeenCalledWith(10);
  });

  it("creates a nudge after validating contact and deal links", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([{ id: contactId }]))
      .mockReturnValueOnce(createChain([{ id: dealId }]));
    mockInsert.mockReturnValueOnce(createChain([makeNudge({ dealId })]));

    const result = await createHumanNudge({
      contactId,
      dealId,
      nudgeType: "manual",
      title: "Call Jane",
      message: "Jane needs a follow-up.",
      dedupKey: "manual:jane",
    });

    expect(result.id).toBe(nudgeId);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns existing nudge on dedupe unique conflict", async () => {
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(Object.assign(new Error("unique"), { code: "23505" })),
      }),
    });
    mockSelect.mockReturnValueOnce(createChain([makeNudge()]));

    const result = await createHumanNudge({
      nudgeType: "manual",
      title: "Call Jane",
      message: "Jane needs a follow-up.",
      dedupKey: "manual:jane",
    });

    expect(result.id).toBe(nudgeId);
  });

  it("throws 404 for invalid linked contact", async () => {
    await expect(
      createHumanNudge({
        contactId: "not-a-uuid",
        nudgeType: "manual",
        title: "Call Jane",
        message: "Jane needs a follow-up.",
      }),
    ).rejects.toThrow(CrmError);
  });

  it("sets acted, dismissed, and snoozed status transitions", async () => {
    mockSelect
      .mockReturnValueOnce(createChain([makeNudge()]))
      .mockReturnValueOnce(createChain([makeNudge()]))
      .mockReturnValueOnce(createChain([makeNudge()]));

    const actSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([makeNudge({ status: "acted" })]),
      }),
    });
    const dismissSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([makeNudge({ status: "dismissed" })]),
      }),
    });
    const snoozeSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([makeNudge({ status: "snoozed" })]),
      }),
    });
    mockUpdate
      .mockReturnValueOnce({ set: actSet })
      .mockReturnValueOnce({ set: dismissSet })
      .mockReturnValueOnce({ set: snoozeSet });

    await markHumanNudgeActed(nudgeId);
    await dismissHumanNudge(nudgeId);
    await snoozeHumanNudge(nudgeId, "2026-05-30T00:00:00.000Z");

    expect(actSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "acted", actedAt: expect.any(String) }),
    );
    expect(dismissSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dismissed", dismissedAt: expect.any(String) }),
    );
    expect(snoozeSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "snoozed", snoozedUntil: "2026-05-30T00:00:00.000Z" }),
    );
  });
});
