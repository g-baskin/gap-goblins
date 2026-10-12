---
type: entity
entity_type: endpoint
title: "POST /api/newsletter/send"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/send/route.ts
language: ts
route_path: /api/newsletter/send
http_methods:
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/triggerSendWorkflow]]"
  - "[[entities/newsletterCampaigns]]"
  - "[[entities/compareApiKeys]]"
  - "[[entities/NEWSLETTER_API_KEY]]"
  - "[[entities/checkRateLimit]]"
related:
  - "[[entities/endpoints/post-api-newsletter-curate]]"
  - "[[entities/endpoints/post-api-newsletter-id-send]]"
  - "[[entities/endpoints/api-newsletter-jobs-id]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/send/route.ts
    lines: "1-142"
---

# POST /api/newsletter/send

## Overview

Triggers the full newsletter send workflow (curate → generate → publish) for a campaign via QStash (`app/api/newsletter/send/route.ts:7`). Authentication is API-key only — this is an automation/orchestration endpoint not a session-authenticated admin endpoint. Supports both production sends and test-mode runs that skip the full subscriber list.

## Signature / Definition

```ts
POST /api/newsletter/send
Headers: { "x-api-key": string }
Body: { campaignId: string, testMode?: boolean, testEmails?: string[], sources?: string[], maxArticles?: number }
Response 202: { success, message, workflow: { workflowRunId, campaignId, campaignName, testMode }, statusUrl }
```

## Behavior

Validates body with `SendNewsletterSchema` (Zod, `route.ts:19–25`). Fetches the campaign and rejects non-active campaigns unless `testMode` is true (`route.ts:74–79`). Falls back to `campaign.sources` and `campaign.articleLimit` when overrides are not provided (`route.ts:85–90`). Returns 202 with a `statusUrl` pointing to `/api/newsletter/jobs/:workflowRunId` for polling. IP-based rate limiting applied even with API-key auth (`route.ts:46–53`).

## Connections

- **depends_on:** `triggerSendWorkflow`, `newsletterCampaigns`, `compareApiKeys`, `checkRateLimit`
- **related:** [[entities/endpoints/post-api-newsletter-curate]], [[entities/endpoints/post-api-newsletter-id-send]], [[entities/endpoints/api-newsletter-jobs-id]]

## Sources

- `app/api/newsletter/send/route.ts` (lines 1–142)
