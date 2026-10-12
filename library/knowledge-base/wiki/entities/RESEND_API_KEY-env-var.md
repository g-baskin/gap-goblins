---
type: entity
title: "RESEND_API_KEY"
entity_type: env-var
status: developing
created: "2026-05-28"
updated: "2026-05-28"
name: RESEND_API_KEY
path: "scripts/worker.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/worker-pg-boss]]"
  - "[[entities/functions/handleEmailReceived]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - env
  - email
sources:
  - "scripts/worker.ts"
  - "lib/outreach/webhooks/events/received.ts"
---

# RESEND_API_KEY

## Overview

API key for Resend email send and inbound receiving API (`scripts/worker.ts:74-77`, `lib/outreach/webhooks/events/received.ts:41`).

## Read sites

- `scripts/worker.ts:75` — `getResend()` throws if missing
- `lib/outreach/webhooks/events/received.ts:41` — inbound reply content fetch

## Connections

- **used_by:** [[entities/worker-pg-boss]], [[entities/functions/handleEmailReceived]]

## Sources

- `scripts/worker.ts` (lines 74–77)
