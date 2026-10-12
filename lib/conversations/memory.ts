import type { ProviderOperationResult } from "./adapters";
import type { CanonicalCommunicationEvent, ProviderAccountContext } from "./domain";
import type {
  CanonicalEventPort,
  ExternalMappingPort,
  OutboundOperation,
  OutboundOperationPort,
  WebhookReceipt,
  WebhookReceiptPort,
} from "./services";

export class InMemoryWebhookReceiptPort implements WebhookReceiptPort {
  private readonly byKey = new Map<string, WebhookReceipt>();
  private sequence = 0;

  async getOrCreate(input: {
    context: ProviderAccountContext;
    idempotencyKey: string;
    receivedAt: Date;
  }): Promise<{ receipt: WebhookReceipt; created: boolean }> {
    const existing = this.byKey.get(input.idempotencyKey);
    if (existing) return { receipt: structuredClone(existing), created: false };
    this.sequence += 1;
    const receipt: WebhookReceipt = {
      id: `receipt-${String(this.sequence).padStart(4, "0")}`,
      idempotencyKey: input.idempotencyKey,
      status: "received",
      canonicalEventId: null,
    };
    this.byKey.set(input.idempotencyKey, receipt);
    return { receipt: structuredClone(receipt), created: true };
  }

  async markProcessed(receiptId: string, canonicalEventId: string): Promise<void> {
    const receipt = this.find(receiptId);
    receipt.status = "processed";
    receipt.canonicalEventId = canonicalEventId;
  }

  async markFailed(receiptId: string, _error: string): Promise<void> {
    this.find(receiptId).status = "failed";
  }

  list(): readonly WebhookReceipt[] {
    return [...this.byKey.values()].map((receipt) => structuredClone(receipt));
  }

  private find(receiptId: string): WebhookReceipt {
    const receipt = [...this.byKey.values()].find((candidate) => candidate.id === receiptId);
    if (!receipt) throw new Error(`Unknown receipt: ${receiptId}`);
    return receipt;
  }
}

export class InMemoryExternalMappingPort implements ExternalMappingPort {
  private readonly mappings = new Map<string, { threadId: string; contactId: string }>();

  bind(input: {
    tenantId: string;
    providerAccountId: string;
    externalThreadId: string;
    threadId: string;
    contactId: string;
  }): this {
    this.mappings.set(this.key(input), { threadId: input.threadId, contactId: input.contactId });
    return this;
  }

  async resolve(input: {
    context: ProviderAccountContext;
    externalThreadId: string;
    externalContactId: string | null;
  }): Promise<{ threadId: string; contactId: string }> {
    const mapping = this.mappings.get(
      this.key({
        tenantId: input.context.tenantId,
        providerAccountId: input.context.providerAccountId,
        externalThreadId: input.externalThreadId,
      }),
    );
    if (!mapping) throw new Error("External conversation mapping was not found");
    return { ...mapping };
  }

  private key(input: {
    tenantId: string;
    providerAccountId: string;
    externalThreadId: string;
  }): string {
    return `${input.tenantId}:${input.providerAccountId}:${input.externalThreadId}`;
  }
}

export class InMemoryCanonicalEventPort implements CanonicalEventPort {
  readonly events: CanonicalCommunicationEvent[] = [];

  async append(
    input: Omit<CanonicalCommunicationEvent, "id">,
  ): Promise<CanonicalCommunicationEvent> {
    const event: CanonicalCommunicationEvent = {
      ...structuredClone(input),
      id: `event-${String(this.events.length + 1).padStart(4, "0")}`,
    };
    this.events.push(event);
    return structuredClone(event);
  }
}

export class InMemoryOutboundOperationPort implements OutboundOperationPort {
  private readonly byKey = new Map<string, OutboundOperation>();
  private sequence = 0;

  async getOrCreate(input: {
    context: ProviderAccountContext;
    scopedIdempotencyKey: string;
  }): Promise<{ operation: OutboundOperation; created: boolean }> {
    const existing = this.byKey.get(input.scopedIdempotencyKey);
    if (existing) return { operation: structuredClone(existing), created: false };
    this.sequence += 1;
    const operation: OutboundOperation = {
      id: `operation-${String(this.sequence).padStart(4, "0")}`,
      scopedIdempotencyKey: input.scopedIdempotencyKey,
      status: "pending",
      result: null,
      error: null,
    };
    this.byKey.set(input.scopedIdempotencyKey, operation);
    return { operation: structuredClone(operation), created: true };
  }

  async succeed(operationId: string, result: ProviderOperationResult): Promise<void> {
    const operation = this.find(operationId);
    operation.status = "succeeded";
    operation.result = structuredClone(result);
  }

  async fail(operationId: string, error: string): Promise<void> {
    const operation = this.find(operationId);
    operation.status = "failed";
    operation.error = error;
  }

  list(): readonly OutboundOperation[] {
    return [...this.byKey.values()].map((operation) => structuredClone(operation));
  }

  private find(operationId: string): OutboundOperation {
    const operation = [...this.byKey.values()].find((candidate) => candidate.id === operationId);
    if (!operation) throw new Error(`Unknown outbound operation: ${operationId}`);
    return operation;
  }
}
