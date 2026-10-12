---
type: entity
title: "worker (pg-boss process)"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "scripts/worker.ts"
language: ts
depends_on:
  - "[[entities/QUEUE-pg-boss]]"
  - "[[entities/DATABASE_URL-env-var]]"
  - "[[entities/RESEND_API_KEY-env-var]]"
  - "[[entities/modules/automation-sender]]"
  - "[[entities/modules/automation-types]]"
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - worker
  - queue
sources:
  - "scripts/worker.ts"
---

# worker (pg-boss process)

## Overview

Long-running Railway service that polls pg-boss and runs newsletter, outreach, and automation job handlers (`scripts/worker.ts:1-10`, `scripts/worker.ts:286-312`).

## Bootstrap

- Requires `DATABASE_URL` (`scripts/worker.ts:54-58`).
- `PgBoss` with `schedule: true`, `supervise: true` (`scripts/worker.ts:60-64`).
- `createQueue` for all queue names on boot (`scripts/worker.ts:292-296`).

## Registered handlers

| Queue | Handler |
|-------|---------|
| newsletter-send | curate → generate → publish pipeline |
| newsletter-curate | `processCurateJob` |
| newsletter-publish | `processPublishJob` |
| newsletter-cleanup | `processCleanupJob` |
| outreach-send-email | [[entities/handleOutreachSendEmail]] |
| automation-send-step | `handleAutomationSendStep` → [[entities/modules/automation-sender]] |
| outreach-process (cron `*/5 * * * *`) | `processDueEmails` |

## Connections

- **queues:** [[entities/QUEUE-pg-boss]]
- **automation handler:** `handleAutomationSendStep` at `scripts/worker.ts:254-264` delegates to [[entities/modules/automation-sender]]

## Sources

- `scripts/worker.ts`
