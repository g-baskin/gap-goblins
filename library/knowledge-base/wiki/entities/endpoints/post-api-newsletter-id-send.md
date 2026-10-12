---
type: entity
entity_type: endpoint
title: "POST /api/newsletter/:id/send"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/[id]/send/route.ts
language: ts
route_path: /api/newsletter/:id/send
http_methods:
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterEditions]]"
  - "[[entities/adminAuditLog]]"
  - "[[entities/triggerPublishWorkflow]]"
  - "[[entities/checkRateLimit]]"
related:
  - "[[entities/endpoints/post-api-newsletter-send]]"
  - "[[entities/endpoints/post-api-newsletter-send-test]]"
  - "[[entities/endpoints/api-newsletter-id]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/[id]/send/route.ts
    lines: "1-279"
---

# POST /api/newsletter/:id/send

## Overview

Sends a specific newsletter edition to subscribers (`app/api/newsletter/[id]/send/route.ts:27`). Supports two modes: **test mode** dispatches a single Resend email inline to a target address; **production mode** atomically flips the edition status to `"queued"` and then triggers a QStash publish workflow via `triggerPublishWorkflow` to fan out to all verified subscribers asynchronously.

## Signature / Definition

```ts
POST /api/newsletter/:id/send
Body: { testMode?: boolean, testEmail?: string }
Response (test):   { success, testMode: true, message, emailId }
Response (prod):   { success, status: "queued", newsletterId, workflowRunId }
```

## Behavior

Rate-limited at 10 sends per hour per user (`route.ts:50–54`). Guards against double-sends: production path uses a conditional `UPDATE ... WHERE status = <previousStatus>` returning clause (`route.ts:193–196`); if 0 rows are returned the request is rejected with 409. On enqueue failure the edition status is best-effort reverted to its prior value (`route.ts:218–225`). Already-sent editions return 400; already-queued/sending editions also return 400.

## Connections

- **depends_on:** `newsletterEditions`, `adminAuditLog`, `triggerPublishWorkflow`, `checkRateLimit`
- **related:** [[entities/endpoints/post-api-newsletter-send]], [[entities/endpoints/post-api-newsletter-send-test]]

## Sources

- `app/api/newsletter/[id]/send/route.ts` (lines 1–279)
