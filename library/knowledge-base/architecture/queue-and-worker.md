# Queue and Worker

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

Background processing with **pg-boss**: queue names, enqueue helpers, worker handlers, and the outreach cron schedule.

**Related:**
- [`scripts/worker.ts`](../../../scripts/worker.ts)
- [`lib/queue/index.ts`](../../../lib/queue/index.ts)
- [`guides/adding-background-jobs.md`](../guides/adding-background-jobs.md)

---

## Overview

The **website** service enqueues jobs by inserting into pg-boss tables. The **worker** service (`bun scripts/worker.ts`) polls queues and runs handlers. Both share `DATABASE_URL`; pg-boss uses the `pgboss` schema.

**Worker is mandatory in production.** Without it, outreach emails and newsletter sends do not run.

---

## Queue inventory

| Queue name | Enqueued from | Handler | Purpose |
|---|---|---|---|
| `newsletter-send` | `enqueueNewsletterSend` | `handleNewsletterSend` | Full pipeline: curate → generate → publish |
| `newsletter-curate` | `enqueueNewsletterCurate` | `handleNewsletterCurate` | RSS/HN/Reddit curation only |
| `newsletter-publish` | `enqueueNewsletterPublish` | `handleNewsletterPublish` | Send edition to subscribers |
| `newsletter-cleanup` | `enqueueNewsletterCleanup` | `handleNewsletterCleanup` | Purge old queue rows |
| `outreach-send-email` | `enqueueOutreachSendEmail` | `handleOutreachSendEmail` | Send sequence email 1/2/3 via Resend |
| `outreach-process` | pg-boss schedule `*/5 * * * *` | `handleOutreachProcess` | Batch due outreach contacts |

Queue name constants: `lib/queue/index.ts` (`QUEUE` object) — keep in sync with `scripts/worker.ts`.

---

## Enqueue options

Default pg-boss send options (from `lib/queue/index.ts`):

- `retryLimit: 2`, `retryDelay: 60` seconds
- `expireInSeconds`: 600–3600 depending on queue
- Outreach supports `startAfter` delay for scheduling

Health check: `getQueueHealth()` probes pg-boss connectivity.

---

## Worker bootstrap

On start (`scripts/worker.ts`):

1. Validate `DATABASE_URL`.
2. `boss.start()` with `schedule: true`, `supervise: true`.
3. `createQueue()` for each queue (idempotent).
4. `boss.work()` registers handlers with `pollingIntervalSeconds: 5`.
5. Schedule `outreach-process` cron every 5 minutes.
6. SIGTERM/SIGINT → graceful `boss.stop()`.

Required env (worker): `DATABASE_URL`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `UNSUBSCRIBE_SECRET`, `DEFAULT_FROM_EMAIL`, `NEWSLETTER_FROM_EMAIL`, bucket vars for assets in emails.

---

## Outreach send handler (summary)

`handleOutreachSendEmail`:

1. Load contact + campaign; skip if inactive, opted out, or idempotent step already sent.
2. Respect business hours (`lib/outreach/scheduling/business-hours.ts`).
3. Apply domain throttling (`OUTREACH_MAX_EMAILS_PER_DOMAIN_PER_HOUR`).
4. Call `sendEmail()` from `lib/outreach/sending/sender.ts` (locked Reply-To rules).
5. Throw on failure so pg-boss retries.

`handleOutreachProcess` calls `processDueEmails()` with batch size from `OUTREACH_BATCH_SIZE`.

---

## Newsletter send handler (summary)

`handleNewsletterSend` chains:

1. `processCurateJob` — fetch/score articles
2. `processGenerateJob` — AI edition body
3. `processPublishJob` — Resend batch to subscribers

Individual steps also available as separate queue jobs for partial workflows.

---

## Cron routes (HTTP alternative)

Some maintenance runs via HTTP cron (Railway cron or external scheduler):

| Route | Secret | Purpose |
|---|---|---|
| `GET /api/cron/process-crm-queue` | `CRON_SECRET` | Drain `crm_sync_queue` |
| `GET /api/cron/newsletter-schedule` | `CRON_SECRET` | Trigger scheduled newsletter jobs |

See [`api/webhooks-and-cron.md`](../api/webhooks-and-cron.md).

---

## Local development

Terminal 1: `bun run dev`  
Terminal 2: `bun run worker`

Verify worker logs show `[worker] pg-boss started` and queue subscriptions.

---

## Related code

- `lib/queue/client.ts` — shared pg-boss singleton for website
- `lib/newsletter/lib/queue/jobs/` — newsletter job processors
- `lib/outreach/sending/processor.ts` — due email batch logic
- Tests: `lib/newsletter/lib/queue/__tests__/`

---

## Changelog

- v1.0 (2026-05) — Initial queue/worker documentation.
