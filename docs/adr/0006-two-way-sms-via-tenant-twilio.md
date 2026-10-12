---
status: accepted
date: 2026-10-12
---

# Two-way SMS in the Conversations inbox through each workspace's own Twilio account

## Context and Problem Statement

The owner wants the CRM's messaging to work like GoHighLevel's Conversations inbox. The `/admin/conversations` screen was a demo with hard-coded data, and the conversation tables and services existed but were never wired to a screen or a real provider. Texting US consumers carries TCPA exposure (statutory damages per unwanted text), and US carriers require A2P 10DLC registration.

## Decision Outcome

Approved by the owner on 2026-10-12 (option "inbox_plus_sms").

- The inbox reads and writes the existing tenant-scoped tables (`conversation_threads`, `communication_events`, `omnichannel_contacts`, `contact_identities`, `channel_accounts`, `outbound_operations`, `provider_webhook_events`). Migration 0016 only adds `unread_count`, `starred`, `last_message_preview`, a partial unique index (one open thread per contact and channel) and a timeline index.
- Each workspace connects **its own** Twilio account and one number in Settings → Messaging. Twilio confirms the number belongs to the account before it is saved. The Auth Token is AES-256-GCM encrypted with `INTEGRATION_ENCRYPTION_KEY` (`enc:v1:` secret reference) and never returned to the browser. A number can be connected to only one workspace.
- Incoming texts and delivery reports arrive at `/api/webhooks/twilio`. The request is matched to a workspace by Account SID **and** number, and its Twilio signature is verified before anything is stored.
- Every send goes through the existing SMS gate (`resolveSmsSendGate`): recorded consent with its source and the contact's timezone, no opt-out, outside 8pm–8am in the contact's timezone, and an active number. Sends carry an idempotency key, so a retry or double-click texts the contact once.
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT and REVOKE opt a contact out immediately on every identity for that number; START, UNSTOP and YES opt back in.
- Texting in proves a number belongs to the contact but is **not** recorded as consent: the team records consent explicitly, choosing how it was given.
- Resend is untouched and still not used for prospect messaging (ADR 0003).

## Consequences

- Good: no platform-wide Twilio bill or shared sender reputation; each workspace's texts come from its own registered number.
- Good: one send chokepoint for automations and the inbox.
- Bad: each workspace must create a Twilio account and complete A2P 10DLC registration before carriers will deliver reliably.
- Bad: Twilio can only call a public https URL. Local development needs a tunnel and `NEXT_PUBLIC_SITE_URL` set to it.
- Bad: the inbox refreshes by polling every 5 seconds rather than pushing updates.
- Not done yet: MMS images (counted, not shown), email, calls, web chat and social channels.
