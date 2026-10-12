import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enrollContactForDealStageChange,
  enrollContactForStatusChange,
  enrollContactForTagAdded,
  enrollContactForTrigger,
} from "../triggers";

function createDrizzleChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "from", "where"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder mock must be thenable
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

const mockSelect = vi.fn();
const mockEnrollContactInFlow = vi.fn();

vi.mock("@/lib/db/worker", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("../enrollments", () => ({
  enrollContactInFlow: (...args: unknown[]) => mockEnrollContactInFlow(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockEnrollContactInFlow.mockImplementation(async (flowId: string, contactId: string) => ({
    id: `${flowId}:${contactId}`,
    flowId,
    contactId,
  }));
});

describe("automation trigger enrollments", () => {
  it("enrolls contacts into all active flows for simple triggers", async () => {
    mockSelect.mockReturnValueOnce(
      createDrizzleChain([
        { id: "flow-1", audienceFilter: {} },
        { id: "flow-2", audienceFilter: {} },
      ]),
    );

    const enrollments = await enrollContactForTrigger("booking_created", "contact-1");

    expect(enrollments).toHaveLength(2);
    expect(mockEnrollContactInFlow).toHaveBeenCalledWith("flow-1", "contact-1");
    expect(mockEnrollContactInFlow).toHaveBeenCalledWith("flow-2", "contact-1");
  });

  it("filters contact status changed flows by configured statuses", async () => {
    mockSelect.mockReturnValueOnce(
      createDrizzleChain([
        { id: "qualified-flow", audienceFilter: { statuses: ["qualified"] } },
        { id: "customer-flow", audienceFilter: { status: "customer" } },
        { id: "all-status-flow", audienceFilter: {} },
      ]),
    );

    const enrollments = await enrollContactForStatusChange({
      contactId: "contact-1",
      status: "qualified",
    });

    expect(enrollments.map((enrollment) => enrollment.flowId)).toEqual([
      "qualified-flow",
      "all-status-flow",
    ]);
    expect(mockEnrollContactInFlow).not.toHaveBeenCalledWith("customer-flow", "contact-1");
  });

  it("filters contact tag flows by any newly added tag", async () => {
    mockSelect.mockReturnValueOnce(
      createDrizzleChain([
        { id: "vip-flow", audienceFilter: { tags: ["vip", "priority"] } },
        { id: "partner-flow", audienceFilter: { tag: "partner" } },
      ]),
    );

    const enrollments = await enrollContactForTagAdded({
      contactId: "contact-1",
      tags: ["vip"],
    });

    expect(enrollments.map((enrollment) => enrollment.flowId)).toEqual(["vip-flow"]);
    expect(mockEnrollContactInFlow).not.toHaveBeenCalledWith("partner-flow", "contact-1");
  });

  it("filters deal stage flows by stage id or slug", async () => {
    mockSelect.mockReturnValueOnce(
      createDrizzleChain([
        { id: "stage-id-flow", audienceFilter: { stageIds: ["stage-1"] } },
        { id: "slug-flow", audienceFilter: { stageSlug: "proposal-sent" } },
        { id: "lost-flow", audienceFilter: { stageSlugs: ["lost"] } },
      ]),
    );

    const enrollments = await enrollContactForDealStageChange({
      contactId: "contact-1",
      stageId: "stage-1",
      stageSlug: "proposal-sent",
    });

    expect(enrollments.map((enrollment) => enrollment.flowId)).toEqual([
      "stage-id-flow",
      "slug-flow",
    ]);
    expect(mockEnrollContactInFlow).not.toHaveBeenCalledWith("lost-flow", "contact-1");
  });
});
