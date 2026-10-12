---
type: entity
entity_type: endpoint
title: "GET /api/cron/process-crm-queue"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/cron/process-crm-queue/route.ts
language: ts
route_path: /api/cron/process-crm-queue
http_methods:
  - GET
  - OPTIONS
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/processCrmQueue]]"
  - "[[entities/cleanupCrmQueue]]"
  - "[[entities/compareBearerToken]]"
  - "[[entities/CRON_SECRET]]"
related:
  - "[[entities/endpoints/get-api-cron-newsletter-schedule]]"
tags:
  - entity
  - endpoint
  - cron
  - crm
sources:
  - path: app/api/cron/process-crm-queue/route.ts
    lines: "1-85"
---

# GET /api/cron/process-crm-queue

## Overview

Cron endpoint that processes pending CRM sync operations from a retry queue with exponential backoff (`app/api/cron/process-crm-queue/route.ts:3`). Triggered every 10 minutes by Upstash QStash; also runs a cleanup pass to remove completed and failed items older than 7 days. Secured by `Authorization: Bearer <CRON_SECRET>` with constant-time comparison.

## Signature / Definition

```ts
GET /api/cron/process-crm-queue
Headers: { Authorization: "Bearer <CRON_SECRET>" }
Response: { success, processed, succeeded, failed, cleanedUp }

OPTIONS /api/cron/process-crm-queue  → CORS preflight (200)
```

## Behavior

Calls `processCrmQueue()` then `cleanupCrmQueue(7)` sequentially (`route.ts:41–44`). Returns counts for `processed`, `succeeded`, `failed`, and `cleanedUp` items. The OPTIONS handler explicitly allows only `GET, OPTIONS` methods and `Authorization` header (`route.ts:74–82`). Does not perform any database queries directly — delegates entirely to `lib/crm-retry-queue`.

## Connections

- **depends_on:** `processCrmQueue`, `cleanupCrmQueue`, `compareBearerToken`
- **related:** [[entities/endpoints/get-api-cron-newsletter-schedule]]

## Sources

- `app/api/cron/process-crm-queue/route.ts` (lines 1–85)
