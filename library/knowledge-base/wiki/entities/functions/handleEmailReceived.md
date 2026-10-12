---
type: entity
title: "handleEmailReceived"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-28"
path: "lib/outreach/webhooks/events/received.ts"
language: ts
depends_on:
  - "[[entities/modules/db-client]]"
  - "[[entities/functions/analyzeReply]]"
  - "[[entities/functions/pushToCrm]]"
used_by:
  - "[[entities/endpoints/post-api-outreach-webhooks-resend]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - outreach
  - webhooks
related:
  - "[[concepts/outreach-reply-to-matching]]"
  - "[[concepts/resend-webhook-event-flow]]"
  - "[[concepts/outreach-reply-to-threading]]"
sources:
  - "lib/outreach/webhooks/events/received.ts"
---

# handleEmailReceived

## Overview

Processes Resend `email.received` webhook events: resolves outreach contact, detects auto-replies, runs AI reply analysis, stores reply row, and pushes positive replies to CRM (`lib/outreach/webhooks/events/received.ts:24-34`).

## Signature / Definition

```ts
export async function handleEmailReceived(
  event: EmailReceivedEvent,
  svixId: string | null
): Promise<boolean>
```

## Contact routing (priority)

1. **Legacy:** `reply+{uuid}@` in To address (`lib/outreach/webhooks/events/received.ts:60-126`).
2. **Primary:** UUIDs extracted from `In-Reply-To` / `References` headers matched against `email1ResendId` / `email2ResendId` / `email3ResendId` (`lib/outreach/webhooks/events/received.ts:128-163`).
3. **Fallback:** match `from` email to outreach contact (`lib/outreach/webhooks/events/received.ts:165-189`).

## Behavior

- Fetches inbound body/headers via Resend Receiving API (`received.ts:37-49`).
- Contact lookup via three-tier routing (legacy UUID in To → In-Reply-To/References UUID match against `email_N_resend_id` → from-email fallback) (`received.ts:60-189`).
- Calls `analyzeReply` and `pushToCrm` for qualifying positive replies.
- Uses `svixId` for idempotency (`received.ts:28`).

## Connections

- **depends_on:** [[entities/functions/analyzeReply]], [[entities/functions/pushToCrm]], [[entities/modules/db-client]]
- **used_by:** [[entities/endpoints/post-api-outreach-webhooks-resend]]
- **concepts:** [[concepts/outreach-reply-to-matching]], [[concepts/resend-webhook-event-flow]], [[concepts/outreach-reply-to-threading]]

## Sources

- `lib/outreach/webhooks/events/received.ts` (lines 31–189+)
