import { describe, expect, it } from "vitest";
import { calculateStepRunAt } from "../steps";

describe("calculateStepRunAt", () => {
  const baseDate = new Date("2026-05-27T10:00:00.000Z");

  it("adds minute delays", () => {
    const result = calculateStepRunAt({ delayAmount: 30, delayUnit: "minutes" }, baseDate);
    expect(result.toISOString()).toBe("2026-05-27T10:30:00.000Z");
  });

  it("adds hour delays", () => {
    const result = calculateStepRunAt({ delayAmount: 2, delayUnit: "hours" }, baseDate);
    expect(result.toISOString()).toBe("2026-05-27T12:00:00.000Z");
  });

  it("adds day delays", () => {
    const result = calculateStepRunAt({ delayAmount: 4, delayUnit: "days" }, baseDate);
    expect(result.toISOString()).toBe("2026-05-31T10:00:00.000Z");
  });

  it("clamps negative delays to immediate", () => {
    const result = calculateStepRunAt({ delayAmount: -5, delayUnit: "days" }, baseDate);
    expect(result.toISOString()).toBe(baseDate.toISOString());
  });
});
