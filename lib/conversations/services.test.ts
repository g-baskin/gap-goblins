import { describe, expect, it } from "vitest";
import type { SimulatedProviderEvent } from "./adapters";
import { FakeMessagingAdapter, FakeVoiceAdapter } from "./fakes";
import {
  InMemoryCanonicalEventPort,
  InMemoryExternalMappingPort,
  InMemoryOutboundOperationPort,
  InMemoryWebhookReceiptPort,
} from "./memory";
import { ConversationIngestionService, OutboundOrchestrationService } from "./services";

const tenantId = "11111111-1111-4111-8111-111111111111";
const messagingAccountId = "22222222-2222-4222-8222-222222222222";
const voiceAccountId = "33333333-3333-4333-8333-333333333333";
const context = {
  tenantId,
  provider: "fake_messaging",
  providerAccountId: messagingAccountId,
};

function event(
  channel: SimulatedProviderEvent["channel"],
  overrides: Partial<SimulatedProviderEvent> = {},
): SimulatedProviderEvent {
  return {
    externalEventId: `external-${channel}`,
    externalThreadId: `thread-${channel}`,
    externalContactId: `contact-${channel}`,
    channel,
    kind: channel === "voice" ? "call_completed" : "message",
    direction: "inbound",
    status: channel === "voice" ? "completed" : "received",
    bodyText: channel === "voice" ? undefined : `hello from ${channel}`,
    occurredAt: new Date("2026-01-01T10:00:00.000Z"),
    ...overrides,
  };
}

function ingestionFixture() {
  const receipts = new InMemoryWebhookReceiptPort();
  const mappings = new InMemoryExternalMappingPort();
  const events = new InMemoryCanonicalEventPort();
  for (const channel of ["web_chat", "sms", "email", "voice"] as const) {
    mappings.bind({
      tenantId,
      providerAccountId: channel === "voice" ? voiceAccountId : messagingAccountId,
      externalThreadId: `thread-${channel}`,
      threadId: `canonical-thread-${channel}`,
      contactId: `canonical-contact-${channel}`,
    });
  }
  return {
    receipts,
    mappings,
    events,
    service: new ConversationIngestionService(receipts, mappings, events),
  };
}

describe("conversation ingestion", () => {
  it("does not append duplicate provider events", async () => {
    const fixture = ingestionFixture();
    const adapter = new FakeMessagingAdapter().program({ type: "duplicate" });
    const webhook = {
      providerAccountId: messagingAccountId,
      receivedAt: new Date("2026-01-01T10:01:00.000Z"),
      payload: [event("sms")],
    };

    const first = await fixture.service.ingest({ context, adapter, webhook });
    const second = await fixture.service.ingest({ context, adapter, webhook });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(fixture.events.events).toHaveLength(1);
    expect(fixture.receipts.list()).toHaveLength(1);
  });

  it("retains provider occurredAt separately from receivedAt for out-of-order events", async () => {
    const fixture = ingestionFixture();
    const adapter = new FakeMessagingAdapter().program({ type: "out_of_order" });
    const receivedAt = new Date("2026-01-01T12:00:00.000Z");
    await fixture.service.ingest({
      context,
      adapter,
      webhook: {
        providerAccountId: messagingAccountId,
        receivedAt,
        payload: [
          event("sms", {
            externalEventId: "earlier",
            occurredAt: new Date("2026-01-01T09:00:00Z"),
          }),
          event("sms", { externalEventId: "later", occurredAt: new Date("2026-01-01T11:00:00Z") }),
        ],
      },
    });

    expect(fixture.events.events.map((item) => item.externalEventId)).toEqual(["later", "earlier"]);
    expect(fixture.events.events[0]?.occurredAt.toISOString()).toBe("2026-01-01T11:00:00.000Z");
    expect(fixture.events.events[0]?.receivedAt.toISOString()).toBe(receivedAt.toISOString());
  });

  it("requires tenant context before normalization or persistence", async () => {
    const fixture = ingestionFixture();
    const adapter = new FakeMessagingAdapter();
    await expect(
      fixture.service.ingest({
        context: { ...context, tenantId: "" },
        adapter,
        webhook: {
          providerAccountId: messagingAccountId,
          receivedAt: new Date(),
          payload: [event("email")],
        },
      }),
    ).rejects.toThrow("tenant context");
    expect(adapter.requests).toHaveLength(0);
    expect(fixture.events.events).toHaveLength(0);
  });

  it("normalizes web chat, SMS, email, and the voice lifecycle", async () => {
    const fixture = ingestionFixture();
    const messaging = new FakeMessagingAdapter();
    for (const channel of ["web_chat", "sms", "email"] as const) {
      await fixture.service.ingest({
        context,
        adapter: messaging,
        webhook: {
          providerAccountId: messagingAccountId,
          receivedAt: new Date("2026-01-01T10:01:00Z"),
          payload: [event(channel)],
        },
      });
    }
    const voice = new FakeVoiceAdapter();
    await fixture.service.ingest({
      context: { tenantId, provider: voice.provider, providerAccountId: voiceAccountId },
      adapter: voice,
      webhook: {
        providerAccountId: voiceAccountId,
        receivedAt: new Date("2026-01-01T10:01:00Z"),
        payload: [event("voice")],
      },
    });

    expect(fixture.events.events.map((item) => item.channel)).toEqual([
      "web_chat",
      "sms",
      "email",
      "voice",
    ]);
    expect(fixture.events.events.at(-1)).toMatchObject({
      kind: "call_completed",
      status: "completed",
    });
  });
});

describe("outbound orchestration", () => {
  it("uses provider-account-scoped idempotency so retries send once", async () => {
    const operations = new InMemoryOutboundOperationPort();
    const service = new OutboundOrchestrationService(operations);
    const adapter = new FakeMessagingAdapter();
    const request = {
      providerAccountId: messagingAccountId,
      idempotencyKey: "reply-42",
      channel: "email" as const,
      to: "person@example.com",
      bodyText: "Hello",
    };

    const first = await service.sendMessage({ context, adapter, request });
    const duplicate = await service.sendMessage({ context, adapter, request });

    expect(first.status).toBe("succeeded");
    expect(duplicate.status).toBe("succeeded");
    expect(adapter.sentRequests).toHaveLength(1);
    expect(operations.list()).toHaveLength(1);
  });
});
