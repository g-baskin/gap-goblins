import { describe, expect, it } from "vitest";
import {
  createHumanNudgeSchema,
  listHumanNudgesSchema,
  snoozeHumanNudgeSchema,
  updateHumanNudgeSchema,
} from "../nudges";

describe("human nudge validation", () => {
  it("accepts a minimal create payload", () => {
    const result = createHumanNudgeSchema.safeParse({
      nudgeType: "manual",
      title: "Call Jane",
      message: "Jane needs a follow-up.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid status transitions", () => {
    const result = updateHumanNudgeSchema.safeParse({ status: "done" });

    expect(result.success).toBe(false);
  });

  it("requires a snooze timestamp", () => {
    const result = snoozeHumanNudgeSchema.safeParse({ snoozedUntil: "tomorrow" });

    expect(result.success).toBe(false);
  });

  it("coerces list pagination and filters", () => {
    const result = listHumanNudgesSchema.safeParse({
      page: "2",
      limit: "25",
      status: "pending",
      priority: "high",
      due: "due",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
      expect(result.data.status).toBe("pending");
    }
  });
});
