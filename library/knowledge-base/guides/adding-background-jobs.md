# Adding Background Jobs

> Category: How-to Guide | Version: 1.0 | Date: May 2026 | Status: Active

Add a new pg-boss queue: enqueue helper, worker handler, and optional cron — following the template-crm pattern.

**Related:**
- [`architecture/queue-and-worker.md`](../architecture/queue-and-worker.md)
- [`lib/queue/index.ts`](../../../lib/queue/index.ts)
- [`scripts/worker.ts`](../../../scripts/worker.ts)

---

## Prerequisites

- Worker running locally (`bun run worker`)
- Understanding of which service enqueues (usually website API route)

---

## Step 1 — Define queue name and payload

In `lib/queue/index.ts`, add to `QUEUE` constant:

```typescript
export const QUEUE = {
  // ...existing
  MY_NEW_JOB: "my-new-job",
} as const;

export interface MyNewJobPayload {
  entityId: string;
  userId: string;
}
```

Keep queue name kebab-case; match string exactly in worker.

---

## Step 2 — Add enqueue function

```typescript
export async function enqueueMyNewJob(payload: MyNewJobPayload): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.MY_NEW_JOB, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 600,
  });
}
```

Call from API route or server action after validation + auth.

---

## Step 3 — Register worker handler

In `scripts/worker.ts`:

1. Add queue name to local `QUEUE` object (or import from `lib/queue`).
2. Implement handler:

```typescript
async function handleMyNewJob([job]: Job<MyNewJobPayload>[]): Promise<void> {
  console.log(`[worker] my-new-job ${job.id}`);
  // idempotent work here — throw to retry
}
```

3. In `main()`, ensure queue created:

```typescript
await boss.createQueue(QUEUE.MY_NEW_JOB);
await boss.work(QUEUE.MY_NEW_JOB, opts, handleMyNewJob);
```

---

## Step 4 — Optional cron schedule

For recurring work (like outreach-process):

```typescript
await boss.schedule("my-new-cron-queue", "0 * * * *"); // hourly
await boss.work("my-new-cron-queue", handleMyNewCron);
```

Alternatively expose `GET /api/cron/my-job` gated by `CRON_SECRET` for external schedulers.

---

## Step 5 — Environment variables

If handler needs new secrets, add to:

- `.env.example` (documented)
- Railway **website** and **worker** services

Worker crashes loudly on missing vars — check deploy logs.

---

## Step 6 — Test

- Unit test job processor logic in isolation (extract pure function).
- Integration: enqueue from dev API, watch worker logs.
- Optional: `lib/newsletter/lib/queue/__tests__/` patterns for queue config tests.

---

## Idempotency checklist

- [ ] Handler safe if run twice for same payload
- [ ] DB writes use unique constraints or status checks
- [ ] Logs include job id + entity id for tracing
- [ ] Failures throw (pg-boss retries) vs return (skip)

---

## Anti-patterns

- ❌ Long work in API route — enqueue instead
- ❌ Import `db` in Client Components
- ❌ Duplicate queue name strings across files without `QUEUE` constant
- ❌ Forgetting to deploy worker when adding new handler

---

## Changelog

- v1.0 (2026-05) — Initial background jobs guide.
