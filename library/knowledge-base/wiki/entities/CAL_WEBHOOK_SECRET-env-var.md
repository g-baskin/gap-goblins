---
type: entity
title: "CAL_WEBHOOK_SECRET"
entity_type: env-var
status: developing
created: "2026-05-28"
updated: "2026-05-28"
name: CAL_WEBHOOK_SECRET
path: "app/api/webhooks/cal/route.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - env
  - webhooks
sources:
  - "app/api/webhooks/cal/route.ts"
---

# CAL_WEBHOOK_SECRET

## Overview

Shared secret for HMAC-SHA256 verification of Cal.com webhook payloads. Must match Cal.com webhook subscriber configuration (`app/api/webhooks/cal/route.ts:396-402`).

## Read sites

- `app/api/webhooks/cal/route.ts:397` — `process.env.CAL_WEBHOOK_SECRET`
- Missing → 500 `"Webhook secret not configured"` (`app/api/webhooks/cal/route.ts:399-401`)

## Connections

- **used_by:** [[entities/endpoints/post-api-webhooks-cal]]

## Sources

- `app/api/webhooks/cal/route.ts` (lines 396–405)
