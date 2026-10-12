---
type: entity
title: "POST /api/outreach/webhooks/resend"
entity_type: endpoint
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "app/api/outreach/webhooks/resend/route.ts"
language: ts
http_method: POST
route_path: "/api/outreach/webhooks/resend"
auth_required: false
depends_on:
  - "[[entities/env-vars/RESEND_WEBHOOK_SECRET]]"
  - "[[entities/functions/handleEmailReceived]]"
used_by: []
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - endpoint
  - webhooks
related:
  - "[[concepts/resend-webhook-event-flow]]"
sources:
  - "app/api/outreach/webhooks/resend/route.ts"
---

# POST /api/outreach/webhooks/resend

## Overview

Resend/Svix webhook ingress for outreach email events (`email.sent`, `email.received`, bounces, etc.) (`app/api/outreach/webhooks/resend/route.ts:6-13`).

## HTTP method + route

`POST /api/outreach/webhooks/resend`

## Auth

Svix signature headers: `svix-id`, `svix-timestamp`, `svix-signature` verified with `RESEND_WEBHOOK_SECRET` (`route.ts:36-57`).

## Behavior

- Rate limit 100/min per IP before HMAC (`route.ts:16-26`).
- Raw text body required for verification (`route.ts:28-33`).
- Delegates to `handleResendWebhook` (`route.ts:59+`).

## Connections

- **concept:** [[concepts/resend-webhook-event-flow]]
- **handler entity:** [[entities/functions/handleEmailReceived]] (for received events)

## Sources

- `app/api/outreach/webhooks/resend/route.ts` (lines 1–60)
