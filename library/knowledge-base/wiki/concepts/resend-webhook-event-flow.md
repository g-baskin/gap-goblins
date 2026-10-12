---
type: concept
title: "Resend webhook event flow"
complexity: intermediate
domain: outreach
aliases:
  - "Svix Resend webhooks"
  - "email.received flow"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - webhooks
  - outreach
related:
  - "[[entities/endpoints/post-api-outreach-webhooks-resend]]"
  - "[[entities/functions/handleEmailReceived]]"
sources:
  - "app/api/outreach/webhooks/resend/route.ts"
  - "lib/outreach/webhooks/events/received.ts"
---

# Resend webhook event flow

## Definition

Resend delivers outreach email lifecycle and inbound reply events via Svix-signed POSTs to `/api/outreach/webhooks/resend`. The route verifies signatures, dispatches by event type, and `email.received` triggers reply processing.

## How it works

1. **Ingress:** `POST` rate-limited, raw body preserved for HMAC (`app/api/outreach/webhooks/resend/route.ts:16-29`).
2. **Verify:** Svix headers + `RESEND_WEBHOOK_SECRET` (`route.ts:36-57`).
3. **Dispatch:** `handleResendWebhook` routes to event handlers.
4. **Inbound reply:** `handleEmailReceived` fetches full email via Resend Receiving API, matches contact, runs AI analysis, pushes to CRM (`lib/outreach/webhooks/events/received.ts:31-49`, `received.ts:128+`).

Webhook routes are excluded from `proxy.ts` matcher — no session/CSRF wrapper (`proxy.ts:130-137`).

## Why it matters

Signature verification must use raw payload bytes. Missing Receiving API fetch loses headers/body needed for In-Reply-To matching.

## Examples in this codebase

- [[entities/endpoints/post-api-outreach-webhooks-resend]]
- [[entities/functions/handleEmailReceived]]
- [[concepts/outreach-reply-to-matching]]

## Sources

- `app/api/outreach/webhooks/resend/route.ts` (lines 1–60)
- `lib/outreach/webhooks/events/received.ts` (lines 31–49)
- `proxy.ts` (lines 130–137)
