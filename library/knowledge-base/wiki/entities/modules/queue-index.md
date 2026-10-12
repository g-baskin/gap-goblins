---
type: entity
title: "queue index (pg-boss enqueue API)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/queue/index.ts"
language: ts
depends_on:
  - "[[entities/modules/db-client]]"
used_by:
  - "[[entities/modules/worker-process]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - queue
related:
  - "[[concepts/pg-boss-job-lifecycle]]"
sources:
  - "lib/queue/index.ts"
---

# queue index (pg-boss enqueue API)

## Overview

Server-only module exporting queue name constants, typed payload interfaces, enqueue functions for newsletter and outreach workflows, and `getQueueHealth` (`lib/queue/index.ts:1-116`).

## Exports

- `QUEUE` constant object with five queue names (`lib/queue/index.ts:20-26`).
- `enqueueNewsletterSend`, `enqueueNewsletterCurate`, `enqueueNewsletterPublish`, `enqueueNewsletterCleanup` (`lib/queue/index.ts:44-84`).
- `enqueueOutreachSendEmail` (`lib/queue/index.ts:86-97`).
- `getQueueHealth()` probes pg-boss via `getQueueStats` (`lib/queue/index.ts:103-115`).

## Connections

- **related concept:** [[concepts/pg-boss-job-lifecycle]]

## Sources

- `lib/queue/index.ts` (lines 1–116)
