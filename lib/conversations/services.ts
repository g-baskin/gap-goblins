import type {
  MessagingAdapter,
  MessagingSendRequest,
  ProviderOperationResult,
  ProviderWebhookInput,
  VoiceAdapter,
  VoiceStartRequest,
} from "./adapters";
import {
  type CanonicalCommunicationEvent,
  type NormalizedProviderEvent,
  outboundOperationIdempotencyKey,
  type ProviderAccountContext,
  providerWebhookIdempotencyKey,
  requireProviderAccountContext,
} from "./domain";

export interface WebhookReceipt {
  id: string;
  idempotencyKey: string;
  status: "received" | "processed" | "failed";
  canonicalEventId: string | null;
}

export interface WebhookReceiptPort {
  getOrCreate(input: {
    context: ProviderAccountContext;
    idempotencyKey: string;
    receivedAt: Date;
  }): Promise<{ receipt: WebhookReceipt; created: boolean }>;
  markProcessed(receiptId: string, canonicalEventId: string): Promise<void>;
  markFailed(receiptId: string, error: string): Promise<void>;
}

export interface ExternalMappingPort {
  resolve(input: {
    context: ProviderAccountContext;
    externalThreadId: string;
    externalContactId: string | null;
  }): Promise<{ threadId: string; contactId: string }>;
}

export interface CanonicalEventPort {
  append(input: Omit<CanonicalCommunicationEvent, "id">): Promise<CanonicalCommunicationEvent>;
}

export interface OutboundOperation {
  id: string;
  scopedIdempotencyKey: string;
  status: "pending" | "succeeded" | "failed";
  result: ProviderOperationResult | null;
  error: string | null;
}

export interface OutboundOperationPort {
  getOrCreate(input: {
    context: ProviderAccountContext;
    scopedIdempotencyKey: string;
  }): Promise<{ operation: OutboundOperation; created: boolean }>;
  succeed(operationId: string, result: ProviderOperationResult): Promise<void>;
  fail(operationId: string, error: string): Promise<void>;
}

export type ProviderAdapter = MessagingAdapter | VoiceAdapter;

export class ConversationIngestionService {
  constructor(
    private readonly receipts: WebhookReceiptPort,
    private readonly mappings: ExternalMappingPort,
    private readonly events: CanonicalEventPort,
  ) {}

  async ingest(input: {
    context: ProviderAccountContext;
    adapter: ProviderAdapter;
    webhook: ProviderWebhookInput;
  }): Promise<readonly CanonicalCommunicationEvent[]> {
    const context = requireProviderAccountContext(input.context);
    if (input.adapter.provider.toLowerCase() !== context.provider) {
      throw new Error("Adapter provider does not match provider-account context");
    }
    if (input.webhook.providerAccountId !== context.providerAccountId) {
      throw new Error("Webhook provider account does not match provider-account context");
    }

    const normalized = await input.adapter.normalizeWebhook(input.webhook);
    const appended: CanonicalCommunicationEvent[] = [];

    for (const event of normalized) {
      this.validateNormalizedEvent(context, event);
      const idempotencyKey = providerWebhookIdempotencyKey({
        provider: context.provider,
        providerAccountId: context.providerAccountId,
        externalEventId: event.externalEventId,
        payloadHash: event.payloadHash,
      });
      const { receipt, created } = await this.receipts.getOrCreate({
        context,
        idempotencyKey,
        receivedAt: event.receivedAt,
      });
      if (!created || receipt.status === "processed") continue;

      try {
        const mapping = await this.mappings.resolve({
          context,
          externalThreadId: event.externalThreadId,
          externalContactId: event.externalContactId ?? null,
        });
        const canonical = await this.events.append({
          tenantId: context.tenantId,
          providerAccountId: context.providerAccountId,
          threadId: mapping.threadId,
          contactId: mapping.contactId,
          channel: event.channel,
          kind: event.kind,
          direction: event.direction,
          status: event.status,
          bodyText: event.bodyText,
          occurredAt: new Date(event.occurredAt),
          receivedAt: new Date(event.receivedAt),
          providerSequence: event.providerSequence,
          externalEventId: event.externalEventId,
          channelData: event.channelData,
        });
        await this.receipts.markProcessed(receipt.id, canonical.id);
        appended.push(canonical);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown ingestion failure";
        await this.receipts.markFailed(receipt.id, message);
        throw error;
      }
    }

    return appended;
  }

  private validateNormalizedEvent(
    context: ReturnType<typeof requireProviderAccountContext>,
    event: NormalizedProviderEvent,
  ): void {
    if (event.provider.toLowerCase() !== context.provider) {
      throw new Error("Normalized event provider does not match context");
    }
    if (event.providerAccountId !== context.providerAccountId) {
      throw new Error("Normalized event provider account does not match context");
    }
    if (Number.isNaN(event.occurredAt.getTime()) || Number.isNaN(event.receivedAt.getTime())) {
      throw new Error("Normalized event timestamps must be valid dates");
    }
  }
}

export class OutboundOrchestrationService {
  constructor(private readonly operations: OutboundOperationPort) {}

  async sendMessage(input: {
    context: ProviderAccountContext;
    adapter: MessagingAdapter;
    request: MessagingSendRequest;
  }): Promise<OutboundOperation> {
    return this.execute(input.context, input.adapter.provider, input.request, () =>
      input.adapter.send(input.request),
    );
  }

  async startCall(input: {
    context: ProviderAccountContext;
    adapter: VoiceAdapter;
    request: VoiceStartRequest;
  }): Promise<OutboundOperation> {
    return this.execute(input.context, input.adapter.provider, input.request, () =>
      input.adapter.startCall(input.request),
    );
  }

  private async execute(
    rawContext: ProviderAccountContext,
    adapterProvider: string,
    request: { providerAccountId: string; idempotencyKey: string },
    dispatch: () => Promise<ProviderOperationResult>,
  ): Promise<OutboundOperation> {
    const context = requireProviderAccountContext(rawContext);
    if (adapterProvider.toLowerCase() !== context.provider) {
      throw new Error("Adapter provider does not match provider-account context");
    }
    if (request.providerAccountId !== context.providerAccountId) {
      throw new Error("Outbound provider account does not match provider-account context");
    }
    const scopedIdempotencyKey = outboundOperationIdempotencyKey(
      context,
      context.providerAccountId,
      request.idempotencyKey,
    );
    const { operation, created } = await this.operations.getOrCreate({
      context,
      scopedIdempotencyKey,
    });
    if (!created) return operation;

    try {
      const result = await dispatch();
      await this.operations.succeed(operation.id, result);
      return { ...operation, status: "succeeded", result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider failure";
      await this.operations.fail(operation.id, message);
      throw error;
    }
  }
}
