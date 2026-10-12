import { describe, expect, it, vi } from "vitest";
import { PermanentNodeError, RetryableNodeError } from "../graph/executor";
import {
  classifyOutboundStatus,
  createOutboundWebhookHandler,
  type SendRequest,
  validateOutboundWebhookUrl,
} from "./outbound";

const resolvePublic = vi.fn(async () => [{ address: "8.8.8.8", family: 4 as const }]);
const baseInput = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  enrollmentId: "00000000-0000-4000-8000-000000000002",
  runId: "00000000-0000-4000-8000-000000000003",
  idempotencyKey: "stable-key",
  config: {
    url: "https://example.com/hook",
    headers: {},
    body: {},
    secretReference: "env:TEST",
    timeoutMs: 1000,
  },
  payload: {},
};

describe("outbound webhook address policy", () => {
  it.each([
    "https://127.0.0.1/hook",
    "https://169.254.169.254/hook",
    "https://10.0.0.1/hook",
    "https://[::1]/hook",
    "http://example.com/hook",
    "https://example.com:8443/hook",
  ])("rejects blocked target %s", async (url) => {
    await expect(validateOutboundWebhookUrl(url, resolvePublic)).rejects.toBeInstanceOf(
      PermanentNodeError,
    );
  });

  it("rejects when any DNS answer is private", async () => {
    await expect(
      validateOutboundWebhookUrl("https://example.com", async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ]),
    ).rejects.toThrow("blocked");
  });

  it("pins a reviewed DNS answer for the request", async () => {
    const sendRequest = vi.fn<SendRequest>(async () => ({
      status: 204,
      body: Buffer.alloc(0),
      durationMs: 5,
    }));
    const handler = createOutboundWebhookHandler({
      resolveHost: resolvePublic,
      sendRequest,
      secretResolver: () => "x".repeat(32),
    });
    await expect(handler(baseInput)).resolves.toMatchObject({ state: "succeeded" });
    const request = sendRequest.mock.calls[0]?.[0];
    expect(request?.address.address).toBe("8.8.8.8");
    expect(request?.headers["x-webhook-signature"]).toMatch(/^sha256=/);
  });

  it("does not follow redirects", async () => {
    const handler = createOutboundWebhookHandler({
      resolveHost: resolvePublic,
      sendRequest: async () => ({ status: 302, body: Buffer.alloc(0), durationMs: 1 }),
      secretResolver: () => "x".repeat(32),
    });
    await expect(handler(baseInput)).rejects.toBeInstanceOf(PermanentNodeError);
  });
});

describe("outbound webhook retries", () => {
  it.each([
    [200, "success"],
    [408, "retryable"],
    [429, "retryable"],
    [503, "retryable"],
    [400, "permanent"],
  ] as const)("classifies %s as %s", (status, expected) => {
    expect(classifyOutboundStatus(status)).toBe(expected);
  });

  it("marks retryable provider responses", async () => {
    const handler = createOutboundWebhookHandler({
      resolveHost: resolvePublic,
      sendRequest: async () => ({ status: 503, body: Buffer.alloc(0), durationMs: 1 }),
      secretResolver: () => "x".repeat(32),
    });
    await expect(handler(baseInput)).rejects.toBeInstanceOf(RetryableNodeError);
  });
});
