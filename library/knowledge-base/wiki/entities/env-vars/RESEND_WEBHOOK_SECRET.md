---
type: entity
title: "RESEND_WEBHOOK_SECRET"
entity_type: env-var
status: mature
created: "2026-05-27"
updated: "2026-05-27"
name: RESEND_WEBHOOK_SECRET
path: "app/api/outreach/webhooks/resend/route.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/endpoints/post-api-outreach-webhooks-resend]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - env-var
  - webhooks
sources:
  - "app/api/outreach/webhooks/resend/route.ts"
---

# RESEND_WEBHOOK_SECRET

## Overview

Svix webhook signing secret for verifying Resend outreach webhook payloads (`app/api/outreach/webhooks/resend/route.ts:36-41`).

## Read sites

- `app/api/outreach/webhooks/resend/route.ts:36` — required; returns 500 if missing

## Connections

- **used_by:** [[entities/endpoints/post-api-outreach-webhooks-resend]]
- **concept:** [[concepts/resend-webhook-event-flow]]

## Sources

- `app/api/outreach/webhooks/resend/route.ts` (lines 36–41)
