---
type: concept
title: "Outreach Reply-To threading"
complexity: intermediate
domain: outreach
aliases:
  - "In-Reply-To matching"
  - "reply routing"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - concept
  - outreach
  - email
related:
  - "[[entities/sendEmail-outreach]]"
  - "[[entities/functions/handleEmailReceived]]"
  - "[[entities/getThreadingHeaders]]"
sources:
  - "lib/outreach/sending/sender.ts"
  - "lib/outreach/webhooks/events/received.ts"
---

# Outreach Reply-To threading

## Definition

Outbound outreach uses the sender's **plain mailbox** as `Reply-To` (never `reply+uuid@`). Inbound replies are correlated to the originating outreach contact via email threading headers, not the Reply-To address (`lib/outreach/sending/sender.ts:237-251`, `lib/outreach/webhooks/events/received.ts:128-130`).

## How it works

**On send:**

1. `replyTo = fromEmail` (sender's real mailbox) — locked (`lib/outreach/sending/sender.ts:251`).
2. Resend send returns an ID stored as `email_N_resend_id` on the contact (`lib/outreach/sending/sender.ts:382-401`).
3. Follow-ups add `In-Reply-To` / `References` via [[entities/getThreadingHeaders]] using prior Resend ID as Message-ID.

**On inbound (`email.received`):**

1. Extract UUIDs from `In-Reply-To` + `References` headers (`lib/outreach/webhooks/events/received.ts:131-139`).
2. Match against `email1ResendId`, `email2ResendId`, or `email3ResendId` (`lib/outreach/webhooks/events/received.ts:147-155`).
3. Legacy fallback: `reply+{contactId}@` in To address (`lib/outreach/webhooks/events/received.ts:60-62`).
4. Last resort: match `from` email to contact record (`lib/outreach/webhooks/events/received.ts:165-178`).

## Why it matters

UUID-suffixed Reply-To addresses look spam-like in Gmail/Outlook and hurt deliverability. Header-based matching preserves trust while still routing replies to the correct campaign contact.

## Examples in this codebase

- [[entities/sendEmail-outreach]] — sets Reply-To and stores Resend IDs
- [[entities/functions/handleEmailReceived]] — primary routing logic

## Connections

- **involves entities:** [[entities/sendEmail-outreach]], [[entities/getThreadingHeaders]], [[entities/functions/handleEmailReceived]]

## Sources

- `lib/outreach/sending/sender.ts` (lines 237–251, 382–401)
- `lib/outreach/webhooks/events/received.ts` (lines 128–189)
