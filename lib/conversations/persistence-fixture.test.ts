import { describe, expect, it } from "vitest";
import { conversationChannels } from "./domain";
import { syntheticPersistenceFixture as fixture } from "./persistence-fixture";

describe("synthetic persistence fixture", () => {
  it("contains the bounded canonical graph", () => {
    expect(fixture.tenants).toHaveLength(1);
    expect(fixture.locations).toHaveLength(1);
    expect(fixture.locations[0].countryCode).toBe("US");
    expect(fixture.tenantMemberships).toHaveLength(1);
    expect(fixture.tenantMemberships[0].role).toBe("agent");
    expect(fixture.omnichannelContacts).toHaveLength(1);
    expect(fixture.channelAccounts).toHaveLength(2);
    expect(fixture.conversationThreads).toHaveLength(1);
    expect(fixture.conversationThreads[0]).not.toHaveProperty("channelAccountId");
    expect(fixture.communicationEvents).toHaveLength(5);
    expect(fixture.providerWebhookEvents).toHaveLength(4);
  });

  it("keeps every tenant-owned row in one tenant", () => {
    const tenantId = fixture.tenants[0].id;
    const collections: readonly (readonly { tenantId: string }[])[] = [
      fixture.tenants,
      fixture.locations,
      fixture.tenantMemberships,
      fixture.omnichannelContacts,
      fixture.contactIdentities,
      fixture.channelAccounts,
      fixture.conversationThreads,
      fixture.communicationEvents,
      fixture.providerWebhookEvents,
    ];
    expect(collections.flat().every((entry) => entry.tenantId === tenantId)).toBe(true);
    expect(
      fixture.contactIdentities.every(
        (identity) => identity.contactId === fixture.omnichannelContacts[0].id,
      ),
    ).toBe(true);
    expect(
      fixture.communicationEvents.every(
        (event) => event.threadId === fixture.conversationThreads[0].id,
      ),
    ).toBe(true);
  });

  it("has verified email, phone, and web identities", () => {
    expect(fixture.contactIdentities.map(({ type }) => type).sort()).toEqual([
      "email",
      "phone",
      "web",
    ]);
    expect(
      fixture.contactIdentities.every(
        ({ verificationStatus }) => verificationStatus === "verified",
      ),
    ).toBe(true);
  });

  it("covers all channels in chronological canonical and provider timelines", () => {
    expect(fixture.communicationEvents.slice(0, 4).map(({ channel }) => channel)).toEqual(
      conversationChannels,
    );
    expect(fixture.providerWebhookEvents.map(({ payload }) => payload.channel)).toEqual(
      conversationChannels,
    );
    for (const events of [fixture.communicationEvents, fixture.providerWebhookEvents]) {
      const times = events.map((event) => Date.parse(event.receivedAt));
      expect(times).toEqual([...times].sort((left, right) => left - right));
    }
    expect(fixture.channelAccounts.map(({ provider }) => provider)).toEqual([
      "fake_messaging",
      "fake_voice",
    ]);
    expect(
      fixture.communicationEvents.map(({ sourceChannelAccountId }) => sourceChannelAccountId),
    ).toEqual([
      fixture.channelAccounts[0].id,
      fixture.channelAccounts[0].id,
      fixture.channelAccounts[0].id,
      fixture.channelAccounts[1].id,
      null,
    ]);
    expect(fixture.communicationEvents[4]).toMatchObject({
      channel: "system",
      kind: "crm_note",
      direction: "internal",
      sourceChannelAccountId: null,
      providerSequence: null,
    });
  });
});
