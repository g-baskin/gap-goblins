---
type: entity
title: "verifyWebhookSignature"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/webhooks/cal/route.ts"
language: ts
depends_on:
  - "[[entities/CAL_WEBHOOK_SECRET-env-var]]"
used_by:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - webhooks
  - security
sources:
  - "app/api/webhooks/cal/route.ts"
---

# verifyWebhookSignature

## Overview

Validates Cal.com `x-cal-signature-256` header against computed HMAC using constant-time comparison (`app/api/webhooks/cal/route.ts:105-134`).

## Signature

```ts
function verifyWebhookSignature(signature: string | null, computedSignature: string): boolean
function computeSignature(payload: string, secret: string): string
```

## Behavior

- Accepts raw hex or `sha256=` prefixed hash (`app/api/webhooks/cal/route.ts:108-119`).
- Rejects non-64-char lowercase hex (`app/api/webhooks/cal/route.ts:121-128`).
- Uses `crypto.timingSafeEqual` (`app/api/webhooks/cal/route.ts:133`).

## Connections

- **used_by:** [[entities/endpoints/post-api-webhooks-cal]]

## Sources

- `app/api/webhooks/cal/route.ts` (lines 91–134)
