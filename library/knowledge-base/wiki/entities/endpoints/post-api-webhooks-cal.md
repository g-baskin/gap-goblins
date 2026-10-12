---
type: entity
title: "POST /api/webhooks/cal"
entity_type: endpoint
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "app/api/webhooks/cal/route.ts"
language: ts
http_method: POST
route_path: "/api/webhooks/cal"
handler: "[[entities/endpoints/post-api-webhooks-cal]]"
auth_required: false
depends_on:
  - "[[entities/modules/db-client]]"
  - "[[entities/env-vars/CAL_WEBHOOK_SECRET]]"
used_by: []
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "app/api/webhooks/cal/__tests__/route.test.ts"
tags:
  - entity
  - endpoint
  - webhooks
related:
  - "[[concepts/cal-webhook-hooks-subdomain]]"
  - "[[concepts/deal-stage-promotion-rules]]"
sources:
  - "app/api/webhooks/cal/route.ts"
---

# POST /api/webhooks/cal

## Overview

Cal.com webhook receiver. Verifies HMAC-SHA256 signature, rate-limits by IP, and on `BOOKING_CREATED` promotes contact to qualified and deal to meeting-booked stage (`app/api/webhooks/cal/route.ts:1-7`, comment at line 150).

## HTTP method + route

`POST /api/webhooks/cal` — must be registered on grey-cloud `hooks.*` subdomain in production (`app/api/webhooks/cal/README.md:7-17`).

## Auth

Unauthenticated; HMAC signature in `x-cal-signature-256` header (`route.ts:96-100`).

## Request validation

- Max body 1MB (`route.ts:22`).
- Webhook max age 5 minutes + 30s clock skew (`route.ts:19-20`).
- Signature via `computeSignature` HMAC-SHA256 (`route.ts:91-93`).

## Response

JSON success/error; updates CRM contacts, deals, timeline via Drizzle + RPC `update_contact_and_deal_for_booking`.

## Connections

- **concepts:** [[concepts/deal-stage-promotion-rules]], [[concepts/cal-webhook-hooks-subdomain]]

## Sources

- `app/api/webhooks/cal/route.ts` (lines 1–100+)
- `app/api/webhooks/cal/README.md` (lines 7–17)
