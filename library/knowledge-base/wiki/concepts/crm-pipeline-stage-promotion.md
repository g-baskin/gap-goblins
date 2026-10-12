---
type: concept
title: "CRM pipeline stage promotion"
complexity: intermediate
domain: crm
aliases:
  - "deal stage flow"
  - "sales pipeline"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - concept
  - crm
related:
  - "[[entities/functions/pushToCrm]]"
  - "[[entities/runCrmBookingSync]]"
  - "[[entities/endpoints/post-api-webhooks-cal]]"
  - "[[concepts/deal-stage-promotion-rules]]"
sources:
  - "lib/outreach/crm/push-to-crm.ts"
  - "app/api/webhooks/cal/route.ts"
---

# CRM pipeline stage promotion

## Definition

Contacts and deals progress through the `sales-pipeline` stages: **Lead → Contacted → Meeting Booked → Proposal Sent → Won → Lost**. Promotion rules differ by entry path — outreach replies never auto-skip past Contacted; only a real Cal.com `BOOKING_CREATED` webhook moves a deal to Meeting Booked (`lib/outreach/crm/push-to-crm.ts:96-98`, `app/api/webhooks/cal/route.ts:149-152`).

## How it works

```
Contact form          → contact status: lead,     deal: Lead
Outreach reply (CRM)  → upsert lead,              deal: Contacted  (pushToCrm)
Cal.com BOOKING_CREATED → RPC upgrade contact,    deal: meeting-booked (runCrmBookingSync)
```

**Outreach path:** [[entities/functions/pushToCrm]] calls `upsert_contact_with_hierarchy_protection` with status `lead` (hierarchy never downgrades), then creates deal at stage slug `contacted` (`lib/outreach/crm/push-to-crm.ts:38-44`, `lib/outreach/crm/push-to-crm.ts:98-102`).

**Booking path:** [[entities/runCrmBookingSync]] resolves slug `meeting-booked` and calls Postgres RPC `update_contact_and_deal_for_booking` atomically (`app/api/webhooks/cal/route.ts:173-200`).

Status hierarchy: subscriber < lead < qualified < customer — enforced by RPC, not application downgrades.

## Why it matters

Misrouting booking promotion (e.g. promoting on positive reply intent alone) would inflate pipeline metrics and bypass the Cal.com proof-of-meeting gate.

## Examples in this codebase

- [[entities/functions/pushToCrm]] — outreach reply lands at Contacted only
- [[entities/runCrmBookingSync]] — Cal booking promotes to Meeting Booked
- [[entities/endpoints/post-api-webhooks-cal]] — orchestrates booking events

## Connections

- **involves entities:** [[entities/functions/pushToCrm]], [[entities/runCrmBookingSync]], [[entities/endpoints/post-api-webhooks-cal]]

## See also

See also [[concepts/deal-stage-promotion-rules]] for the 2026-05-27 canonical version with event table and Cal.com gate summary.

## Sources

- `lib/outreach/crm/push-to-crm.ts` (lines 96–98)
- `app/api/webhooks/cal/route.ts` (lines 149–200)
