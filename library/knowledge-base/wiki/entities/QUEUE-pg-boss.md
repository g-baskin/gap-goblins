---
type: entity
title: "QUEUE (pg-boss names)"
entity_type: queue
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/queue/index.ts"
language: ts
queue_framework: pg-boss
queue_name: "newsletter-send, newsletter-curate, newsletter-publish, newsletter-cleanup, outreach-send-email, automation-send-step"
triggers:
  - "[[entities/handleOutreachSendEmail]]"
  - "[[entities/worker-pg-boss]]"
depends_on:
  - "[[entities/DATABASE_URL-env-var]]"
used_by: []
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - queue
sources:
  - "lib/queue/index.ts"
  - "scripts/worker.ts"
---

# QUEUE (pg-boss names)

## Overview

Single source of truth for pg-boss queue name strings and typed enqueue helpers (`lib/queue/index.ts:17-28`).

## Queue names

| Constant | String |
|----------|--------|
| NEWSLETTER_SEND | `newsletter-send` |
| NEWSLETTER_CURATE | `newsletter-curate` |
| NEWSLETTER_PUBLISH | `newsletter-publish` |
| NEWSLETTER_CLEANUP | `newsletter-cleanup` |
| OUTREACH_SEND_EMAIL | `outreach-send-email` |
| AUTOMATION_SEND_STEP | `automation-send-step` |

Worker also registers `outreach-process` cron queue (`scripts/worker.ts:47-48`).

## Enqueue functions

- `enqueueOutreachSendEmail` — retry 2, expire 600s (`lib/queue/index.ts:88-98`).
- `enqueueAutomationSendStep` — `singletonKey: enrollmentId` (`lib/queue/index.ts:101-112`).
- `getQueueHealth()` — probes DB via `getQueueStats` (`lib/queue/index.ts:119-132`).

## Connections

- **worker:** [[entities/worker-pg-boss]]
- **handler pair:** [[entities/handleOutreachSendEmail]]

## Sources

- `lib/queue/index.ts`
