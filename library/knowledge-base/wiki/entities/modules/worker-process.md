---
type: entity
title: "worker process (pg-boss)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "scripts/worker.ts"
language: ts
depends_on:
  - "[[entities/env-vars/DATABASE_URL]]"
  - "[[entities/functions/sendEmail]]"
triggers:
  - "[[entities/queues/outreach-send-email]]"
  - "[[entities/cron-jobs/outreach-process-cron]]"
used_by: []
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tested_by: []
tags:
  - entity
  - worker
related:
  - "[[concepts/pg-boss-job-lifecycle]]"
sources:
  - "scripts/worker.ts"
---

# worker process (pg-boss)

## Overview

Long-running Railway service entry (`bun scripts/worker.ts`) that boots pg-boss, ensures queues exist, registers job handlers, and schedules recurring outreach processing (`scripts/worker.ts:1-10`, `279-304`).

## Behavior

- Requires `DATABASE_URL`; exits if missing (`scripts/worker.ts:60-64`).
- PgBoss with `schedule: true`, `supervise: true` (`scripts/worker.ts:66-70`).
- Handlers: newsletter send/curate/publish/cleanup pipelines + outreach send (`scripts/worker.ts:90-258`, `293-297`).
- Schedules `outreach-process` queue every 5 minutes (`scripts/worker.ts:299-302`).
- Graceful shutdown on SIGTERM (`scripts/worker.ts:306-309`).

## Connections

- **queues:** [[entities/queues/outreach-send-email]]
- **cron:** [[entities/cron-jobs/outreach-process-cron]]
- **concept:** [[concepts/pg-boss-job-lifecycle]]

## Sources

- `scripts/worker.ts` (lines 1–324)
