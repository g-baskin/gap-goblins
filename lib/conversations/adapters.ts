import type {
  CommunicationDirection,
  CommunicationStatus,
  ConversationChannel,
  NormalizedProviderEvent,
} from "./domain";

export interface ProviderOperationResult {
  externalReference: string;
  status: CommunicationStatus;
  occurredAt: Date;
}

interface ProviderSendBase {
  providerAccountId: string;
  idempotencyKey: string;
  to: string;
  bodyText: string;
}

export interface MessagingSendRequest extends ProviderSendBase {
  channel: Exclude<ConversationChannel, "voice">;
  subject?: string;
}

export interface VoiceStartRequest {
  providerAccountId: string;
  idempotencyKey: string;
  from: string;
  to: string;
  recordingEnabled: false;
}

export interface ProviderWebhookInput {
  providerAccountId: string;
  receivedAt: Date;
  payload: unknown;
}

export interface MessagingAdapter {
  readonly provider: string;
  send(request: MessagingSendRequest): Promise<ProviderOperationResult>;
  normalizeWebhook(input: ProviderWebhookInput): Promise<readonly NormalizedProviderEvent[]>;
}

export interface VoiceAdapter {
  readonly provider: string;
  startCall(request: VoiceStartRequest): Promise<ProviderOperationResult>;
  normalizeWebhook(input: ProviderWebhookInput): Promise<readonly NormalizedProviderEvent[]>;
}

export interface SimulatedProviderEvent {
  externalEventId: string;
  externalThreadId: string;
  externalContactId?: string;
  channel: ConversationChannel;
  kind: NormalizedProviderEvent["kind"];
  direction: CommunicationDirection;
  status: CommunicationStatus;
  occurredAt: Date;
  bodyText?: string;
  providerSequence?: string;
  channelData?: Readonly<Record<string, unknown>>;
}
