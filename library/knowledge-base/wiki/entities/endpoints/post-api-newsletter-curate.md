---
type: entity
entity_type: endpoint
title: "POST /api/newsletter/curate"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/curate/route.ts
language: ts
route_path: /api/newsletter/curate
http_methods:
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/triggerCurateWorkflow]]"
  - "[[entities/compareApiKeys]]"
  - "[[entities/NEWSLETTER_API_KEY]]"
related:
  - "[[entities/endpoints/post-api-newsletter-send]]"
  - "[[entities/endpoints/api-newsletter-jobs-id]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/curate/route.ts
    lines: "1-104"
---

# POST /api/newsletter/curate

## Overview

Triggers a QStash content-curation workflow that fetches, deduplicates, scores, and filters articles for a newsletter campaign (`app/api/newsletter/curate/route.ts:6`). Authentication is via `x-api-key` header using constant-time comparison against `NEWSLETTER_API_KEY` — this is an internal/automation endpoint, not a session-authenticated admin endpoint.

## Signature / Definition

```ts
POST /api/newsletter/curate
Headers: { "x-api-key": string }
Body: { campaignId: string, sources: string[], maxArticles?: number, userId?: string }
Response 202: { success, workflowRunId, message, data: { campaignId, sources, maxArticles }, statusUrl }
```

## Behavior

Validates the request body with `CurateRequestSchema` (Zod, `route.ts:18–23`). After API-key verification, calls `triggerCurateWorkflow` with the validated payload and returns a 202 Accepted response containing the `workflowRunId` and a `statusUrl` pointing to `/api/newsletter/jobs/:workflowRunId` for polling (`route.ts:60–78`). Zod validation errors return 400 with an issues array.

## Connections

- **depends_on:** `triggerCurateWorkflow`, `compareApiKeys`
- **related:** [[entities/endpoints/post-api-newsletter-send]], [[entities/endpoints/api-newsletter-jobs-id]]

## Sources

- `app/api/newsletter/curate/route.ts` (lines 1–104)
