import { describe, expect, it } from "vitest";
import { DisabledSmsProvider, RecordingSmsProvider } from "./provider";
import { isQuietHour } from "./service";
import { twilioOperationState } from "./webhook";

describe("SMS providers", () => {
  it("records without making a network request", async () => {
    const provider = new RecordingSmsProvider();
    const result = await provider.send({ to: "+15550001111", from: "+15550002222", body: "Hi" });
    expect(result.providerReference).toBe("recording-1");
    expect(provider.requests).toEqual([{ to: "+15550001111", from: "+15550002222", body: "Hi" }]);
  });

  it("fails closed when disabled", async () => {
    await expect(
      new DisabledSmsProvider().send({ to: "+15550001111", from: "+15550002222", body: "Hi" }),
    ).rejects.toThrow("disabled");
  });
});

describe("SMS quiet hours", () => {
  it("uses the contact timezone", () => {
    const midnightUtc = new Date("2026-01-01T00:00:00.000Z");
    expect(isQuietHour(midnightUtc, "UTC")).toBe(true);
    expect(isQuietHour(midnightUtc, "Australia/Perth")).toBe(false);
  });

  it("rejects invalid timezones", () => {
    expect(() => isQuietHour(new Date(), "Not/AZone")).toThrow();
  });
});

describe("Twilio delivery callbacks", () => {
  it("maps terminal delivery outcomes onto operation state", () => {
    expect(twilioOperationState("delivered")).toBe("succeeded");
    expect(twilioOperationState("undelivered")).toBe("failed");
    expect(twilioOperationState("failed")).toBe("failed");
    expect(twilioOperationState("queued")).toBeNull();
  });
});
