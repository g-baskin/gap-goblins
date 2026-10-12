---
type: concept
title: "pg-boss job lifecycle"
complexity: intermediate
domain: background-jobs
aliases:
  - "pg-boss queues"
  - "worker job flow"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - queue
related:
  - "[[entities/modules/queue-index]]"
  - "[[entities/modules/worker-process]]"
  - "[[entities/queues/outreach-send-email]]"
sources:
  - "lib/queue/index.ts"
  - "scripts/worker.ts"
---

# pg-boss job lifecycle

## Definition

Background work uses pg-boss backed by the same Railway Postgres as the app. The Next.js website enqueues jobs; a separate `worker` Railway service registers handlers and polls queues.

## How it works

```
Route/cron → lib/queue/index.ts enqueue*()
                    ↓ boss.send(queueName, payload)
            pgboss.job table (Postgres)
                    ↓ polling
            scripts/worker.ts boss.work(handler)
```

**Queue names** (single source in `lib/queue/index.ts:20-26`):
- `newsletter-send`, `newsletter-curate`, `newsletter-publish`, `newsletter-cleanup`
- `outreach-send-email`
- `outreach-process` (cron `*/5 * * * *`, `scripts/worker.ts:53-54`, `300-301`)

**Enqueue options:** retry limits, `expireInSeconds`, optional `startAfter` for outreach (`lib/queue/index.ts:44-96`).

**Worker boot:** creates queues idempotently, registers handlers, schedules outreach-process cron (`scripts/worker.ts:279-302`).

## Why it matters

HTTP handlers must not block on email send or newsletter pipeline steps. Missing worker process = jobs stuck in `pgboss.job`.

## Examples in this codebase

- [[entities/functions/enqueueOutreachSendEmail]] — outreach send enqueue
- [[entities/modules/worker-process]] — handler registration

## Sources

- `lib/queue/index.ts` (lines 1–116)
- `scripts/worker.ts` (lines 45–54, 279–302)
