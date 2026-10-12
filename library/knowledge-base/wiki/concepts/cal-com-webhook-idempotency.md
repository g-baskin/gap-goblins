---
type: concept
title: "Cal.com webhook idempotency"
complexity: intermediate
domain: webhooks
aliases:
  - "webhook dedup"
  - "cal replay protection"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - concept
  - webhooks
related:
  - "[[entities/webhook-event-dedup-sql-table]]"
  - "[[entities/endpoints/post-api-webhooks-cal]]"
  - "[[entities/verifyWebhookSignature]]"
  - "[[concepts/cal-webhook-hooks-subdomain]]"
sources:
  - "app/api/webhooks/cal/route.ts"
  - "lib/db/drizzle/0015_webhook_event_dedup.sql"
---

# Cal.com webhook idempotency

## Definition

Cal.com webhooks are processed at-most-once per logical event using the `webhook_event_dedup` table, layered on top of timestamp validation and HMAC signature verification (`app/api/webhooks/cal/route.ts:446-525`).

## How it works

**Layer 1 — Authenticity:** HMAC-SHA256 via [[entities/verifyWebhookSignature]] and `CAL_WEBHOOK_SECRET` (`app/api/webhooks/cal/route.ts:394-426`).

**Layer 2 — Freshness:** Reject payloads older than 5 minutes or >30s in the future (`app/api/webhooks/cal/route.ts:446-469`).

**Layer 3 — Dedup ledger:**

```ts
const dedupKey = `${normalizedEvent}:${bookingId}`;
await db.insert(webhookEventDedup)
  .values({ source: "cal", eventId: dedupKey })
  .onConflictDoNothing();
```

(`app/api/webhooks/cal/route.ts:507-517`)

- Composite key includes **event type + booking UID** so `BOOKING_CREATED` and `BOOKING_CANCELLED` for the same booking are independent (`app/api/webhooks/cal/route.ts:507-508`).
- Duplicate insert → 200 `"Duplicate webhook ignored"` (`app/api/webhooks/cal/route.ts:519-524`).

**Layer 4 — Domain idempotency:** `contact_submissions.cal_booking_id` checks and atomic NULL-guard updates for booking attachment (`app/api/webhooks/cal/route.ts:702-777`).

## Why it matters

Cal.com retries failed webhooks; without dedup, CRM stage changes and timeline events would duplicate.

## Examples in this codebase

- [[entities/webhook-event-dedup-sql-table]] — storage
- [[entities/endpoints/post-api-webhooks-cal]] — full handler

## Connections

- **involves entities:** [[entities/webhookEventDedup-data-model]], [[entities/endpoints/post-api-webhooks-cal]]

## See also

See also [[concepts/cal-webhook-hooks-subdomain]] for the 2026-05-27 canonical version covering DNS routing and Bot Fight Mode bypass.

## Sources

- `app/api/webhooks/cal/route.ts` (lines 446–525)
- `lib/db/drizzle/0015_webhook_event_dedup.sql`
