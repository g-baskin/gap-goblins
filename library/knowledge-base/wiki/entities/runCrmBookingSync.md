---
type: entity
title: "runCrmBookingSync"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/webhooks/cal/route.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - crm
  - webhooks
related:
  - "[[concepts/crm-pipeline-stage-promotion]]"
sources:
  - "app/api/webhooks/cal/route.ts"
---

# runCrmBookingSync

## Overview

Internal helper for `BOOKING_CREATED` Cal.com events. Finds CRM contact by attendee email and atomically promotes deal to **Meeting Booked** via Postgres RPC (`app/api/webhooks/cal/route.ts:153-266`).

## Signature

```ts
async function runCrmBookingSync(
  attendeeEmail: string,
  bookingId: string,
  startTime: string,
  eventTitle: string,
): Promise<{ contactFound: boolean }>
```

## Behavior

1. Lookup `contacts` by email (`app/api/webhooks/cal/route.ts:160-169`).
2. Resolve stage slug `meeting-booked` (`app/api/webhooks/cal/route.ts:173-182`).
3. Execute `update_contact_and_deal_for_booking(contactId, stageId, bookingId, now)` (`app/api/webhooks/cal/route.ts:193-200`).
4. Sets `deals.meetingBookedAt` and writes timeline events (`app/api/webhooks/cal/route.ts:215-257`).

## Connections

- **endpoint:** [[entities/endpoints/post-api-webhooks-cal]]
- **concept:** [[concepts/crm-pipeline-stage-promotion]]

## Sources

- `app/api/webhooks/cal/route.ts` (lines 153–266)
