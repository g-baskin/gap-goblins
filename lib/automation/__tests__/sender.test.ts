import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAutomationUnsubscribeUrl, sendAutomationStep } from "../sender";

function createDrizzleChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "from", "where", "limit", "update", "set", "insert", "values"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockExecute = vi.fn();
const mockAdvanceEnrollmentToNextStep = vi.fn();

vi.mock("@/lib/db/worker", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}));

vi.mock("../enrollments", () => ({
  advanceEnrollmentToNextStep: (...args: unknown[]) => mockAdvanceEnrollmentToNextStep(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAdvanceEnrollmentToNextStep.mockResolvedValue(null);
  mockExecute.mockResolvedValue([]);
  mockUpdate.mockReturnValue(createDrizzleChain([]));
  mockInsert.mockReturnValue(createDrizzleChain([]));
});

describe("buildAutomationUnsubscribeUrl", () => {
  it("builds signed one-click unsubscribe URL from site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    vi.stubEnv("UNSUBSCRIBE_SECRET", "test-secret");
    const url = new URL(buildAutomationUnsubscribeUrl({ id: "enrollment-1" }));
    expect(url.origin + url.pathname).toBe(
      "https://example.test/api/automation/unsubscribe/enrollment-1",
    );
    expect(url.searchParams.get("token")).toMatch(/^v1\./);
  });
});

describe("sendAutomationStep action steps", () => {
  const enrollment = {
    id: "enrollment-1",
    flowId: "flow-1",
    subscriberId: null,
    contactId: "contact-1",
    email: "lead@example.com",
    status: "active",
    currentStepId: "step-1",
    currentStepOrder: 0,
  };

  const flow = { id: "flow-1", status: "active" };

  it("adds only missing tags and advances the enrollment", async () => {
    const step = {
      id: "step-1",
      stepOrder: 1,
      stepType: "add_tag",
      settings: { tags: ["vip", "priority"] },
    };

    mockSelect
      .mockReturnValueOnce(createDrizzleChain([enrollment]))
      .mockReturnValueOnce(createDrizzleChain([flow]))
      .mockReturnValueOnce(createDrizzleChain([step]))
      .mockReturnValueOnce(createDrizzleChain([{ tags: ["vip"] }]));

    const result = await sendAutomationStep({} as never, {
      enrollmentId: "enrollment-1",
      flowId: "flow-1",
      stepId: "step-1",
    });

    expect(result).toEqual({ success: true, skipped: true });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockAdvanceEnrollmentToNextStep).toHaveBeenCalledWith("enrollment-1");
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("updates contact status without downgrading", async () => {
    const step = {
      id: "step-1",
      stepOrder: 1,
      stepType: "update_contact_status",
      settings: { status: "qualified" },
    };

    mockSelect
      .mockReturnValueOnce(createDrizzleChain([enrollment]))
      .mockReturnValueOnce(createDrizzleChain([flow]))
      .mockReturnValueOnce(createDrizzleChain([step]))
      .mockReturnValueOnce(createDrizzleChain([{ contactStatus: "lead" }]));

    await sendAutomationStep({} as never, {
      enrollmentId: "enrollment-1",
      flowId: "flow-1",
      stepId: "step-1",
    });

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockAdvanceEnrollmentToNextStep).toHaveBeenCalledWith("enrollment-1");
  });

  it("skips contact status downgrades", async () => {
    const step = {
      id: "step-1",
      stepOrder: 1,
      stepType: "update_contact_status",
      settings: { status: "lead" },
    };

    mockSelect
      .mockReturnValueOnce(createDrizzleChain([enrollment]))
      .mockReturnValueOnce(createDrizzleChain([flow]))
      .mockReturnValueOnce(createDrizzleChain([step]))
      .mockReturnValueOnce(createDrizzleChain([{ contactStatus: "customer" }]));

    await sendAutomationStep({} as never, {
      enrollmentId: "enrollment-1",
      flowId: "flow-1",
      stepId: "step-1",
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockAdvanceEnrollmentToNextStep).toHaveBeenCalledWith("enrollment-1");
  });
});
