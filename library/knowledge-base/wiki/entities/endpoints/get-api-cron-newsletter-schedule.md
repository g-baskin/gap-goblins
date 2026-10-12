---
type: entity
entity_type: endpoint
title: "GET /api/cron/newsletter-schedule"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/cron/newsletter-schedule/route.ts
language: ts
route_path: /api/cron/newsletter-schedule
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterEditions]]"
  - "[[entities/newsletterCampaigns]]"
  - "[[entities/triggerSendWorkflow]]"
  - "[[entities/compareBearerToken]]"
  - "[[entities/CRON_SECRET]]"
related:
  - "[[entities/endpoints/get-api-cron-process-crm-queue]]"
  - "[[entities/endpoints/post-api-newsletter-send]]"
tags:
  - entity
  - endpoint
  - cron
  - newsletter
sources:
  - path: app/api/cron/newsletter-schedule/route.ts
    lines: "1-182"
---

# GET /api/cron/newsletter-schedule

## Overview

Cron endpoint that checks for newsletters with `status='scheduled'` and a `scheduledAt` time within the last 15 minutes, then triggers a QStash send workflow for each one (`app/api/cron/newsletter-schedule/route.ts:17`). Designed to run every 10 minutes via Upstash QStash; authenticated via `Authorization: Bearer <CRON_SECRET>` using constant-time comparison.

## Signature / Definition

```ts
GET /api/cron/newsletter-schedule
Headers: { Authorization: "Bearer <CRON_SECRET>" }
Response: { success, enqueued: number, failed: number, total: number }
```

## Behavior

Uses an atomic claim pattern to prevent double-sends from overlapping invocations: each scheduled edition is updated `status: 'scheduled' → 'sending'` with a `WHERE status = 'scheduled'` guard; only the invocation that wins the race (returns 1 row) dispatches the workflow (`route.ts:106–112`). On dispatch failure, status is reverted to `'failed'` for visibility (`route.ts:140–152`). `maxDuration` is set to 60 seconds (`route.ts:10`).

## Connections

- **depends_on:** `newsletterEditions`, `newsletterCampaigns`, `triggerSendWorkflow`, `compareBearerToken`
- **related:** [[entities/endpoints/get-api-cron-process-crm-queue]], [[entities/endpoints/post-api-newsletter-send]]

## Sources

- `app/api/cron/newsletter-schedule/route.ts` (lines 1–182)
