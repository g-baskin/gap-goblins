---
type: concept
title: "Cal webhook hooks subdomain (grey cloud)"
complexity: intermediate
domain: webhooks
aliases:
  - "grey cloud Cal webhook"
  - "hooks subdomain DNS-only"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - webhooks
  - cloudflare
related:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
  - "[[entities/modules/proxy]]"
  - "[[concepts/cal-com-webhook-idempotency]]"
sources:
  - "app/api/webhooks/cal/README.md"
  - "proxy.ts"
---

# Cal webhook hooks subdomain (grey cloud)

## Definition

Production Cal.com webhooks must POST to `https://hooks.<domain>/api/webhooks/cal` on a DNS-only (grey cloud) subdomain, bypassing Cloudflare Bot Fight Mode that returns 403 for Cal.com POSTs on the orange-cloud apex.

## How it works

1. Cal.com sends `BOOKING_CREATED` to `hooks.*` CNAME → Railway directly (`app/api/webhooks/cal/README.md:11-17`).
2. Apex domain stays orange-cloud for DDoS protection; webhook path on apex would be blocked (`app/api/webhooks/cal/README.md:13-14`).
3. `proxy.ts` returns 404 for any non-webhook traffic hitting `hooks.*` / `webhooks.*` hostnames (`proxy.ts:49-65`).
4. Webhook routes are excluded from the proxy matcher so they never hit auth/CSRF (`proxy.ts:130-137`).

## Why it matters

Orange-clouding `hooks` or moving the webhook URL to the apex silently breaks booking → CRM sync; deals stay at Contacted instead of Meeting Booked (`app/api/webhooks/cal/README.md:17`).

## Examples in this codebase

- [[entities/endpoints/post-api-webhooks-cal]] — HMAC verification and deal stage promotion
- [[concepts/deal-stage-promotion-rules]] — only Cal booking promotes to meeting-booked

## Connections

- **related concepts:** [[concepts/deal-stage-promotion-rules]]

## See also

See also [[concepts/cal-com-webhook-idempotency]] for the 2026-05-28 enriched version covering the four-layer dedup protocol.

## Sources

- `app/api/webhooks/cal/README.md` (lines 11–21)
- `proxy.ts` (lines 49–65, 130–137)
