---
type: entity
entity_type: endpoint
title: "GET /api/newsletter/queue/stats"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/queue/stats/route.ts
language: ts
route_path: /api/newsletter/queue/stats
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/getQueueHealth]]"
  - "[[entities/getRecentWorkflowRuns]]"
  - "[[entities/compareApiKeys]]"
  - "[[entities/NEWSLETTER_API_KEY]]"
related:
  - "[[entities/endpoints/api-newsletter-jobs-id]]"
  - "[[entities/endpoints/get-api-newsletter-stats]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/queue/stats/route.ts
    lines: "1-63"
---

# GET /api/newsletter/queue/stats

## Overview

Returns workflow health metrics and recent run history from the QStash queue layer (`app/api/newsletter/queue/stats/route.ts:8`). Protected by `x-api-key` header; calls `getQueueHealth()` and `getRecentWorkflowRuns(10)` in parallel via `Promise.all` and surfaces the combined result with a server-side `timestamp`.

## Signature / Definition

```ts
GET /api/newsletter/queue/stats
Headers: { "x-api-key": string }
Response: { success, health: {...}, recentRuns: WorkflowRun[], timestamp: string }
```

## Behavior

Authentication is API-key only — no session check (`route.ts:39–41`). `getQueueHealth` and `getRecentWorkflowRuns(10)` run concurrently (`route.ts:45`). Returns 500 on any error from either call. Intended for monitoring dashboards and automation pipelines, not for direct admin UI use.

## Connections

- **depends_on:** `getQueueHealth`, `getRecentWorkflowRuns`, `compareApiKeys`
- **related:** [[entities/endpoints/api-newsletter-jobs-id]], [[entities/endpoints/get-api-newsletter-stats]]

## Sources

- `app/api/newsletter/queue/stats/route.ts` (lines 1–63)
