---
type: entity
title: "enqueueOutreachSendEmail"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-28"
path: "lib/queue/index.ts"
language: ts
depends_on:
  - "[[entities/queues/outreach-send-email]]"
used_by:
  - "[[entities/modules/worker-process]]"
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
---

# enqueueOutreachSendEmail

## Overview

Enqueues a single outreach sequence send job on the `outreach-send-email` pg-boss queue (`lib/queue/index.ts:86-97`).

## Signature / Definition

```ts
export async function enqueueOutreachSendEmail(
  payload: OutreachSendEmailPayload,
  options?: { startAfter?: number }
): Promise<string | null>
```

## Payload

```ts
interface OutreachSendEmailPayload {
  contactId: string;
  campaignId: string;
  emailNumber: 1 | 2 | 3;
  unsubscribeUrl: string;
  forceTextOnly?: boolean;
}
```

(`lib/queue/index.ts:32-38`)

## Behavior

- Calls `boss.send(QUEUE.OUTREACH_SEND_EMAIL, payload, { retryLimit: 2, retryDelay: 60, expireInSeconds: 600, startAfter? })` (`lib/queue/index.ts:90-96`).
- Optional `startAfter` delay (seconds) passed through to pg-boss `send()`.

## Connections

- **triggers queue:** [[entities/queues/outreach-send-email]]
- **used_by:** [[entities/modules/worker-process]]
- **processed by:** `handleOutreachSendEmail` (handler in worker process — entity not yet scanned)
- **concept:** [[concepts/pg-boss-job-lifecycle]]

## Sources

- `lib/queue/index.ts` (lines 32–97)
