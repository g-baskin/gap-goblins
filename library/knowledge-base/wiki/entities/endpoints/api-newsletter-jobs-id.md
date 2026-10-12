---
type: entity
entity_type: endpoint
title: "GET/DELETE /api/newsletter/jobs/:id"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/jobs/[id]/route.ts
language: ts
route_path: /api/newsletter/jobs/:id
http_methods:
  - GET
  - DELETE
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/getWorkflowRunStatus]]"
  - "[[entities/cancelWorkflow]]"
  - "[[entities/compareApiKeys]]"
  - "[[entities/NEWSLETTER_API_KEY]]"
related:
  - "[[entities/endpoints/post-api-newsletter-curate]]"
  - "[[entities/endpoints/post-api-newsletter-send]]"
  - "[[entities/endpoints/get-api-newsletter-queue-stats]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/jobs/[id]/route.ts
    lines: "1-108"
---

# GET/DELETE /api/newsletter/jobs/:id

## Overview

Status and cancellation interface for newsletter QStash workflow runs (`app/api/newsletter/jobs/[id]/route.ts:7`). GET proxies `getWorkflowRunStatus(id)` to the QStash API and returns workflow state and timestamps; DELETE calls `cancelWorkflow(id)` to abort an in-progress run. Both methods authenticate via `x-api-key` header against `NEWSLETTER_API_KEY`.

## Signature / Definition

```ts
GET    /api/newsletter/jobs/:id  → { success, workflow: { workflowRunId, workflowUrl, state, createdAt, updatedAt } }
DELETE /api/newsletter/jobs/:id  → { success, message: "Workflow run cancelled successfully" }
```

## Behavior

`verifyApiKey` performs constant-time comparison using `compareApiKeys` (`route.ts:18–32`). GET returns 404 when `getWorkflowRunStatus` returns null (`route.ts:50–52`). The `state` field reflects the raw QStash `workflowState` value. The `statusUrl` pattern used by curation and send endpoints points to this handler.

## Connections

- **depends_on:** `getWorkflowRunStatus`, `cancelWorkflow`, `compareApiKeys`
- **related:** [[entities/endpoints/post-api-newsletter-curate]], [[entities/endpoints/get-api-newsletter-queue-stats]]

## Sources

- `app/api/newsletter/jobs/[id]/route.ts` (lines 1–108)
