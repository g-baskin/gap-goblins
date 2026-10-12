import { describe, expect, it, vi } from "vitest";
import {
  contactIdentityUniquenessKey,
  normalizeIdentity,
  outboundOperationIdempotencyKey,
  providerWebhookIdempotencyKey,
  requireTenantContext,
} from "./domain";
import { TenantConversationRepository } from "./persistence";

const tenantId = "11111111-1111-4111-8111-111111111111";
const providerAccountId = "22222222-2222-4222-8222-222222222222";

describe("conversation persistence domain", () => {
  it("requires valid tenant context and passes it to every persistence operation", async () => {
    expect(() => requireTenantContext({ tenantId: "" })).toThrow("tenant context");
    const persistence = {
      findThread: vi.fn().mockResolvedValue({ id: "thread" }),
      listEvents: vi.fn().mockResolvedValue([]),
    };
    const repository = new TenantConversationRepository({ tenantId }, persistence);
    await repository.findThread("thread");
    await repository.listEvents("thread");
    expect(persistence.findThread).toHaveBeenCalledWith(tenantId, "thread");
    expect(persistence.listEvents).toHaveBeenCalledWith(tenantId, "thread");
  });

  it("normalizes email and E.164 phone identities deterministically", () => {
    expect(normalizeIdentity("email", " Person@Example.COM ")).toBe("person@example.com");
    expect(normalizeIdentity("phone", " +1 (415) 555-0123 ")).toBe("+14155550123");
    expect(() => normalizeIdentity("phone", "4155550123")).toThrow("E.164");
  });

  it("defines identity uniqueness inside a tenant", () => {
    expect(contactIdentityUniquenessKey({ tenantId }, "EMAIL", "A@EXAMPLE.COM")).toBe(
      `${tenantId}:email:a@example.com`,
    );
  });

  it("deduplicates webhooks and outbound operations within a provider account", () => {
    expect(
      providerWebhookIdempotencyKey({
        provider: "Chatwoot",
        providerAccountId,
        externalEventId: "evt-1",
      }),
    ).toBe(`chatwoot:${providerAccountId}:evt-1`);
    expect(
      providerWebhookIdempotencyKey({
        provider: "Chatwoot",
        providerAccountId,
        payloadHash: "sha256",
      }),
    ).toBe(`chatwoot:${providerAccountId}:sha256`);
    expect(outboundOperationIdempotencyKey({ tenantId }, providerAccountId, "send-1")).toBe(
      `${tenantId}:${providerAccountId}:send-1`,
    );
  });
});
