import { describe, expect, it } from "vitest";
import { replaceAutomationStepsSchema } from "../automation";

describe("replaceAutomationStepsSchema", () => {
  it("accepts CRM action steps with required settings", () => {
    const result = replaceAutomationStepsSchema.safeParse({
      steps: [
        {
          stepType: "add_tag",
          name: "Tag VIP",
          delayAmount: 0,
          delayUnit: "minutes",
          settings: { tags: ["vip"] },
        },
        {
          stepType: "update_contact_status",
          name: "Qualify contact",
          delayAmount: 0,
          delayUnit: "minutes",
          settings: { status: "qualified" },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects action steps missing required settings", () => {
    const result = replaceAutomationStepsSchema.safeParse({
      steps: [
        {
          stepType: "add_tag",
          name: "Tag VIP",
          settings: { tags: [] },
        },
        {
          stepType: "update_contact_status",
          name: "Qualify contact",
          settings: {},
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Add tag steps require at least one tag in settings.tags",
      );
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Update status steps require settings.status",
      );
    }
  });
});
