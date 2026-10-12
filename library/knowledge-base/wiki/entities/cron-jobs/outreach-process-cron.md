---
type: entity
title: "outreach-process cron (*/5 * * * *)"
entity_type: cron-job
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "scripts/worker.ts"
language: ts
cron_framework: other
schedule: "*/5 * * * *"
timezone: UTC
depends_on:
  - "[[entities/modules/worker-process]]"
triggers:
  - "[[entities/functions/handleOutreachProcess]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tested_by: []
tags:
  - entity
  - cron
  - outreach
related:
  - "[[concepts/pg-boss-job-lifecycle]]"
sources:
  - "scripts/worker.ts"
---

# outreach-process cron (*/5 * * * *)

## Overview

pg-boss scheduled queue `outreach-process` firing every five minutes to run `processDueEmails` batch sender (`scripts/worker.ts:53-54`, `260-273`, `299-302`).

## Schedule

Cron expression: `*/5 * * * *` (`scripts/worker.ts:54`).

## Target handler

`handleOutreachProcess` calls `processDueEmails` with `OUTREACH_BATCH_SIZE` and unsubscribe base URL (`scripts/worker.ts:260-268`). Errors swallowed so one failed tick does not poison schedule (`scripts/worker.ts:269-272`).

## Connections

- **paired queue:** outreach-process (pg-boss schedule, not in `lib/queue/QUEUE` export)
- **concept:** [[concepts/pg-boss-job-lifecycle]]

## Sources

- `scripts/worker.ts` (lines 53–54, 260–302)
