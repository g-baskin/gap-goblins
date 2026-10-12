import { describe, expect, it } from "vitest";
import {
  demoConversations,
  filterDemoConversations,
  getComposeDisabledReason,
} from "./conversations-demo";

describe("filterDemoConversations", () => {
  it("searches normalized contact and message fields", () => {
    expect(filterDemoConversations(demoConversations, "  NORTHSTAR  ", "all")).toHaveLength(1);
    expect(
      filterDemoConversations(demoConversations, "lead assignment", "all")[0]?.contact.name,
    ).toBe("Sofia Reyes");
  });

  it("applies unread, recent, and starred filters", () => {
    expect(
      filterDemoConversations(demoConversations, "", "unread").map((item) => item.contact.name),
    ).toEqual([
      "Maya Chen",
      "Avery Wilson",
      "Devon Price",
      "Sofia Reyes",
      "Riley Khan",
      "Cameron Lee",
      "Morgan Patel",
    ]);
    expect(
      filterDemoConversations(demoConversations, "", "recent").map((item) => item.contact.name),
    ).toEqual(["Maya Chen", "Jordan Bell", "Avery Wilson", "Devon Price"]);
    expect(
      filterDemoConversations(demoConversations, "", "starred").map((item) => item.contact.name),
    ).toEqual(["Maya Chen", "Sofia Reyes"]);
  });
});

describe("getComposeDisabledReason", () => {
  it("prioritizes an unavailable channel over an empty draft", () => {
    expect(getComposeDisabledReason(demoConversations[1]!, "sms", "")).toBe(
      "SMS consent has not been recorded for this contact.",
    );
  });

  it("always keeps the demo non-sending", () => {
    expect(getComposeDisabledReason(demoConversations[0]!, "email", "Ready to send")).toBe(
      "Sending is disabled in the Phase 0 local demo.",
    );
    expect(getComposeDisabledReason(demoConversations[0]!, "email", "  ")).toBe(
      "Write a message before sending.",
    );
  });
});
