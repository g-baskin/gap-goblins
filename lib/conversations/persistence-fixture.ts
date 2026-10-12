import type { ConversationChannel } from "./domain";

interface FixtureRow {
  readonly id: string;
  readonly tenantId: string;
}

export interface SyntheticPersistenceFixture {
  readonly tenants: readonly [
    FixtureRow & { readonly slug: string; readonly name: string; readonly status: "active" },
  ];
  readonly locations: readonly [
    FixtureRow & {
      readonly name: string;
      readonly slug: string;
      readonly timezone: string;
      readonly countryCode: "US";
      readonly status: "active";
    },
  ];
  readonly tenantMemberships: readonly [
    FixtureRow & { readonly userId: string; readonly role: "agent"; readonly status: "active" },
  ];
  readonly omnichannelContacts: readonly [
    FixtureRow & { readonly displayName: string; readonly status: "active" },
  ];
  readonly contactIdentities: readonly (FixtureRow & {
    readonly contactId: string;
    readonly type: "email" | "phone" | "web";
    readonly value: string;
    readonly normalizedValue: string;
    readonly verificationStatus: "verified";
    readonly provenance: "synthetic_fixture";
  })[];
  readonly channelAccounts: readonly (FixtureRow & {
    readonly locationId: string;
    readonly provider: "fake_messaging" | "fake_voice";
    readonly externalAccountId: string;
    readonly displayName: string;
    readonly capabilities: Readonly<{ channels: readonly ConversationChannel[] }>;
    readonly status: "active";
    readonly secretReference: null;
  })[];
  readonly conversationThreads: readonly [
    FixtureRow & {
      readonly locationId: string;
      readonly contactId: string;
      readonly channel: "web_chat";
      readonly state: "open";
      readonly subject: string;
      readonly lastEventAt: string;
    },
  ];
  readonly communicationEvents: readonly (FixtureRow & {
    readonly threadId: string;
    readonly contactId: string;
    readonly sourceChannelAccountId: string | null;
    readonly channel: ConversationChannel | "system";
    readonly kind: "message" | "call_completed" | "crm_note";
    readonly direction: "inbound" | "outbound" | "internal";
    readonly status: "received" | "sent" | "completed" | "recorded";
    readonly bodyText: string | null;
    readonly occurredAt: string;
    readonly receivedAt: string;
    readonly providerSequence: string | null;
  })[];
  readonly providerWebhookEvents: readonly (FixtureRow & {
    readonly channelAccountId: string;
    readonly provider: "fake_messaging" | "fake_voice";
    readonly externalEventId: string;
    readonly payloadHash: null;
    readonly signatureVerified: true;
    readonly processingStatus: "processed";
    readonly payload: Readonly<{ channel: ConversationChannel }>;
    readonly receivedAt: string;
    readonly processedAt: string;
    readonly error: null;
  })[];
}

const ids = {
  tenant: "00000000-0000-4000-8000-000000000010",
  location: "00000000-0000-4000-8000-000000000011",
  membership: "00000000-0000-4000-8000-000000000012",
  user: "00000000-0000-4000-8000-000000000013",
  contact: "00000000-0000-4000-8000-000000000014",
  messagingAccount: "00000000-0000-4000-8000-000000000015",
  voiceAccount: "00000000-0000-4000-8000-000000000016",
  thread: "00000000-0000-4000-8000-000000000017",
} as const;

const channels = ["web_chat", "sms", "email", "voice"] as const;
const times = [
  "2026-01-01T15:00:00.000Z",
  "2026-01-01T15:01:00.000Z",
  "2026-01-01T15:02:00.000Z",
  "2026-01-01T15:03:00.000Z",
  "2026-01-01T15:04:00.000Z",
] as const;
const row = (id: string) => ({ id, tenantId: ids.tenant });

/** Local-only rows shaped after the omnichannel persistence schema. */
export const syntheticPersistenceFixture: Readonly<SyntheticPersistenceFixture> = {
  tenants: [
    { ...row(ids.tenant), slug: "fixture-tenant", name: "Fixture Tenant", status: "active" },
  ],
  locations: [
    {
      ...row(ids.location),
      name: "Austin",
      slug: "austin",
      timezone: "America/Chicago",
      countryCode: "US",
      status: "active",
    },
  ],
  tenantMemberships: [
    { ...row(ids.membership), userId: ids.user, role: "agent", status: "active" },
  ],
  omnichannelContacts: [{ ...row(ids.contact), displayName: "Ada Fixture", status: "active" }],
  contactIdentities: (
    [
      ["email", "ada@example.test", "ada@example.test"],
      ["phone", "+15125550100", "+15125550100"],
      ["web", "visitor-fixture-001", "visitor-fixture-001"],
    ] as const
  ).map(([type, value, normalizedValue], index) => ({
    ...row(`00000000-0000-4000-8000-00000000002${index}`),
    contactId: ids.contact,
    type,
    value,
    normalizedValue,
    verificationStatus: "verified",
    provenance: "synthetic_fixture",
  })),
  channelAccounts: [
    {
      ...row(ids.messagingAccount),
      locationId: ids.location,
      provider: "fake_messaging",
      externalAccountId: "fixture-messaging",
      displayName: "Fixture Messaging",
      capabilities: { channels: ["web_chat", "sms", "email"] },
      status: "active",
      secretReference: null,
    },
    {
      ...row(ids.voiceAccount),
      locationId: ids.location,
      provider: "fake_voice",
      externalAccountId: "fixture-voice",
      displayName: "Fixture Voice",
      capabilities: { channels: ["voice"] },
      status: "active",
      secretReference: null,
    },
  ],
  conversationThreads: [
    {
      ...row(ids.thread),
      locationId: ids.location,
      contactId: ids.contact,
      channel: "web_chat",
      state: "open",
      subject: "Synthetic omnichannel journey",
      lastEventAt: times[3],
    },
  ],
  communicationEvents: [
    ...channels.map((channel, index) => ({
      ...row(`00000000-0000-4000-8000-00000000003${index}`),
      threadId: ids.thread,
      contactId: ids.contact,
      sourceChannelAccountId: channel === "voice" ? ids.voiceAccount : ids.messagingAccount,
      channel,
      kind: channel === "voice" ? ("call_completed" as const) : ("message" as const),
      direction: channel === "email" ? ("outbound" as const) : ("inbound" as const),
      status:
        channel === "voice"
          ? ("completed" as const)
          : channel === "email"
            ? ("sent" as const)
            : ("received" as const),
      bodyText: channel === "voice" ? null : `Synthetic ${channel} event`,
      occurredAt: times[index],
      receivedAt: times[index],
      providerSequence: String(index + 1),
    })),
    {
      ...row("00000000-0000-4000-8000-000000000034"),
      threadId: ids.thread,
      contactId: ids.contact,
      sourceChannelAccountId: null,
      channel: "system",
      kind: "crm_note",
      direction: "internal",
      status: "recorded",
      bodyText: "Synthetic CRM event without provider provenance",
      occurredAt: times[4],
      receivedAt: times[4],
      providerSequence: null,
    },
  ],
  providerWebhookEvents: channels.map((channel, index) => ({
    ...row(`00000000-0000-4000-8000-00000000004${index}`),
    channelAccountId: channel === "voice" ? ids.voiceAccount : ids.messagingAccount,
    provider: channel === "voice" ? "fake_voice" : "fake_messaging",
    externalEventId: `fixture-${channel}-001`,
    payloadHash: null,
    signatureVerified: true,
    processingStatus: "processed",
    payload: { channel },
    receivedAt: times[index],
    processedAt: times[index],
    error: null,
  })),
};
