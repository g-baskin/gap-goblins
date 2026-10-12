import { describe, expect, it, vi } from "vitest";
import { buildAutomationUnsubscribeToken, verifyAutomationUnsubscribeToken } from "../unsubscribe";

describe("automation unsubscribe tokens", () => {
  it("verifies a token for the matching enrollment", () => {
    vi.stubEnv("UNSUBSCRIBE_SECRET", "test-secret");
    const token = buildAutomationUnsubscribeToken("enrollment-1");
    expect(verifyAutomationUnsubscribeToken("enrollment-1", token)).toBe(true);
    expect(verifyAutomationUnsubscribeToken("enrollment-2", token)).toBe(false);
  });
});
