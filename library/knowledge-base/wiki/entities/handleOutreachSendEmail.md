---
type: entity
title: "handleOutreachSendEmail"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "scripts/worker.ts"
language: ts
depends_on:
  - "[[entities/sendEmail-outreach]]"
used_by:
  - "[[entities/worker-pg-boss]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - worker
  - outreach
sources:
  - "scripts/worker.ts"
---

# handleOutreachSendEmail

## Overview

pg-boss worker handler for `outreach-send-email` jobs. Loads contact/campaign, enforces business hours and domain throttle, then calls [[entities/sendEmail-outreach]] (`scripts/worker.ts:167-252`).

## Guards (skip without error)

- Contact missing, not `active`, or opted out (`scripts/worker.ts:174-187`).
- Idempotency: `current_step >= emailNumber` (`scripts/worker.ts:189-195`).
- Campaign not `active` or `test_mode` (`scripts/worker.ts:198-210`).
- Outside business hours → `rescheduleContact(60)` (`scripts/worker.ts:212-221`).
- Domain hourly cap → reschedule with `OUTREACH_DOMAIN_THROTTLE_DELAY_MINUTES` (`scripts/worker.ts:227-236`).

## On failure

Throws so pg-boss retries (`scripts/worker.ts:247-249`).

## Connections

- **queue:** [[entities/QUEUE-pg-boss]] / `OUTREACH_SEND_EMAIL`
- **sender:** [[entities/sendEmail-outreach]]

## Sources

- `scripts/worker.ts` (lines 167–252)
