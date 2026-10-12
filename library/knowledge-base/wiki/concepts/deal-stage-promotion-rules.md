---
type: concept
title: "Deal stage promotion rules"
complexity: intermediate
domain: crm
aliases:
  - "Meeting Booked promotion"
  - "Cal.com stage gate"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - crm
  - pipeline
related:
  - "[[entities/functions/pushToCrm]]"
  - "[[entities/endpoints/post-api-webhooks-cal]]"
  - "[[concepts/crm-pipeline-stage-promotion]]"
sources:
  - "lib/outreach/crm/push-to-crm.ts"
  - "app/api/webhooks/cal/route.ts"
  - "CLAUDE.md"
---

# Deal stage promotion rules

## Definition

Sales pipeline stages progress Lead → Contacted → Meeting Booked → Proposal Sent → Won/Lost. Outreach positive replies create deals at **Contacted** only. **Meeting Booked** requires a real Cal.com `BOOKING_CREATED` webhook.

## How it works

| Event | Contact status | Deal stage |
|---|---|---|
| Contact form | lead | Lead |
| Outreach positive reply | lead (via hierarchy RPC) | Contacted (`push-to-crm.ts:96-106`) |
| Cal.com booking | qualified | meeting-booked (`cal/route.ts:150+`) |

`pushToCrm` explicitly selects stage slug `contacted` and comments that only Cal.com promotes to meeting-booked (`lib/outreach/crm/push-to-crm.ts:96-97`).

AI reply intent (e.g. `schedule_call`) does **not** advance deal stage.

## Why it matters

Prevents false pipeline inflation from AI-classified intent without an actual calendar booking.

## Examples in this codebase

- [[entities/functions/pushToCrm]] — always `contacted` stage
- [[entities/endpoints/post-api-webhooks-cal]] — `BOOKING_CREATED` handler

## See also

See also [[concepts/crm-pipeline-stage-promotion]] for the 2026-05-28 enriched version with full flow diagram and booking-path detail.

## Sources

- `lib/outreach/crm/push-to-crm.ts` (lines 96–106)
- `app/api/webhooks/cal/route.ts` (line 150 comment block)
- `CLAUDE.md` (CRM Pipeline section)
