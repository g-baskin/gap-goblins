---
type: entity
title: "outreach-send-email (pg-boss queue)"
entity_type: queue
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/queue/index.ts"
language: ts
queue_framework: other
queue_name: "outreach-send-email"
depends_on:
  - "[[entities/modules/db-client]]"
triggers:
  - "[[entities/handleOutreachSendEmail]]"
used_by:
  - "[[entities/functions/enqueueOutreachSendEmail]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - queue
  - outreach
related:
  - "[[concepts/pg-boss-job-lifecycle]]"
sources:
  - "lib/queue/index.ts"
  - "scripts/worker.ts"
---

# outreach-send-email (pg-boss queue)

## Overview

pg-boss queue named `outreach-send-email` (`QUEUE.OUTREACH_SEND_EMAIL`) for asynchronous outreach sequence sends (`lib/queue/index.ts:25`, `scripts/worker.ts:50`).

## Framework

pg-boss (PostgreSQL-backed), not BullMQ/Inngest.

## Handler

Worker registers `boss.work(QUEUE.OUTREACH_SEND_EMAIL, handleOutreachSendEmail)` (`scripts/worker.ts:297`). Handler loads contact/campaign, applies throttling, calls [[entities/functions/sendEmail]].

## Job options

`retryLimit: 2`, `retryDelay: 60`, `expireInSeconds: 600` (`lib/queue/index.ts:91-95`).

## Connections

- **triggers:** worker handler (see `scripts/worker.ts:190-258`)
- **enqueued by:** [[entities/functions/enqueueOutreachSendEmail]]

## Sources

- `lib/queue/index.ts` (lines 20–26, 86–97)
- `scripts/worker.ts` (lines 50, 297)
