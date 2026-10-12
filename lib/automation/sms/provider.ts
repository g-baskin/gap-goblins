import twilio from "twilio";

export type SmsSendRequest = {
  to: string;
  from: string;
  body: string;
  statusCallback?: string;
};
export type SmsSendResult = { providerReference: string; status?: string };

export interface SmsProvider {
  readonly name: string;
  send(request: SmsSendRequest): Promise<SmsSendResult>;
}

export class DisabledSmsProvider implements SmsProvider {
  readonly name = "disabled";
  async send(_request: SmsSendRequest): Promise<never> {
    throw new Error("SMS provider is disabled");
  }
}

export class RecordingSmsProvider implements SmsProvider {
  readonly name = "recording";
  readonly requests: SmsSendRequest[] = [];
  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    this.requests.push(structuredClone(request));
    return { providerReference: `recording-${this.requests.length}`, status: "recorded" };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";
  private readonly client: ReturnType<typeof twilio>;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    const message = await this.client.messages.create({
      to: request.to,
      from: request.from,
      body: request.body,
      statusCallback: request.statusCallback,
    });
    return { providerReference: message.sid, status: message.status };
  }
}
