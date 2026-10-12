import type {
  MessagingAdapter,
  MessagingSendRequest,
  ProviderOperationResult,
  ProviderWebhookInput,
  SimulatedProviderEvent,
  VoiceAdapter,
  VoiceStartRequest,
} from "./adapters";
import type { NormalizedProviderEvent } from "./domain";

export type FakeBehavior =
  | { type: "success" }
  | { type: "failure"; message: string }
  | { type: "duplicate"; copies?: number }
  | { type: "out_of_order" };

function applyBehavior<T>(values: readonly T[], behavior: FakeBehavior): T[] {
  if (behavior.type === "failure") throw new Error(behavior.message);
  if (behavior.type === "duplicate") {
    const copies = behavior.copies ?? 2;
    return values.flatMap((value) => Array.from({ length: copies }, () => value));
  }
  if (behavior.type === "out_of_order") return [...values].reverse();
  return [...values];
}

abstract class DeterministicFakeBase {
  private behavior: FakeBehavior = { type: "success" };
  private sequence = 0;
  readonly requests: unknown[] = [];

  program(behavior: FakeBehavior): this {
    this.behavior = behavior;
    return this;
  }

  protected nextResult(prefix: string): ProviderOperationResult {
    if (this.behavior.type === "failure") throw new Error(this.behavior.message);
    this.sequence += 1;
    return {
      externalReference: `${prefix}-${String(this.sequence).padStart(4, "0")}`,
      status: "sent",
      occurredAt: new Date(Date.UTC(2026, 0, 1, 0, 0, this.sequence)),
    };
  }

  protected normalize(
    provider: string,
    input: ProviderWebhookInput,
  ): readonly NormalizedProviderEvent[] {
    if (!Array.isArray(input.payload))
      throw new Error("Fake webhook payload must be an event array");
    const events = input.payload as readonly SimulatedProviderEvent[];
    return applyBehavior(events, this.behavior).map((event) => ({
      provider,
      providerAccountId: input.providerAccountId,
      externalEventId: event.externalEventId,
      payloadHash: null,
      externalThreadId: event.externalThreadId,
      externalContactId: event.externalContactId ?? null,
      channel: event.channel,
      kind: event.kind,
      direction: event.direction,
      status: event.status,
      bodyText: event.bodyText ?? null,
      occurredAt: new Date(event.occurredAt),
      receivedAt: new Date(input.receivedAt),
      providerSequence: event.providerSequence ?? null,
      channelData: event.channelData ?? {},
    }));
  }
}

export class FakeMessagingAdapter extends DeterministicFakeBase implements MessagingAdapter {
  readonly provider: string;
  readonly sentRequests: MessagingSendRequest[] = [];

  constructor(provider = "fake_messaging") {
    super();
    this.provider = provider;
  }

  async send(request: MessagingSendRequest): Promise<ProviderOperationResult> {
    this.sentRequests.push(structuredClone(request));
    this.requests.push(request);
    return this.nextResult("message");
  }

  async normalizeWebhook(input: ProviderWebhookInput): Promise<readonly NormalizedProviderEvent[]> {
    return this.normalize(this.provider, input);
  }
}

export class FakeVoiceAdapter extends DeterministicFakeBase implements VoiceAdapter {
  readonly provider: string;
  readonly callRequests: VoiceStartRequest[] = [];

  constructor(provider = "fake_voice") {
    super();
    this.provider = provider;
  }

  async startCall(request: VoiceStartRequest): Promise<ProviderOperationResult> {
    this.callRequests.push(structuredClone(request));
    this.requests.push(request);
    return { ...this.nextResult("call"), status: "queued" };
  }

  async normalizeWebhook(input: ProviderWebhookInput): Promise<readonly NormalizedProviderEvent[]> {
    return this.normalize(this.provider, input);
  }
}
