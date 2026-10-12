---
type: entity
entity_type: endpoint
title: "GET /api/newsletter/stats"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/stats/route.ts
language: ts
route_path: /api/newsletter/stats
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterSubscribers]]"
  - "[[entities/newsletterCampaigns]]"
  - "[[entities/newsletterEditions]]"
  - "[[entities/compareApiKeys]]"
  - "[[entities/NEWSLETTER_API_KEY]]"
related:
  - "[[entities/endpoints/api-newsletter]]"
  - "[[entities/endpoints/get-api-newsletter-queue-stats]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/stats/route.ts
    lines: "1-225"
---

# GET /api/newsletter/stats

## Overview

Returns aggregated newsletter statistics for the admin dashboard including total subscriber count, active campaign count, average open/click rates, total emails sent, and a chronological activity feed (`app/api/newsletter/stats/route.ts:6`). Accepts either an admin session or `x-api-key` header for authentication.

## Signature / Definition

```ts
GET /api/newsletter/stats
Response: { totalSubscribers, activeCampaigns, avgOpenRate, avgClickRate, totalSent, recentActivity: Array<{ id, type, description, timestamp }> }
```

## Behavior

Runs five database queries concurrently via `Promise.all` (`route.ts:82–131`): verified+active subscriber count, active campaign count, all sent-edition stats for rate calculations, 5 recent sent editions, and 5 recent verified subscribers. Open/click rates are calculated as fractions then converted to percentage with 1 decimal (`route.ts:206`). Activity items from editions and subscribers are merged and sorted by timestamp, limited to 10 (`route.ts:198`). IP-based rate limiting applies regardless of auth method.

## Connections

- **depends_on:** `newsletterSubscribers`, `newsletterCampaigns`, `newsletterEditions`, `compareApiKeys`
- **related:** [[entities/endpoints/api-newsletter]], [[entities/endpoints/get-api-newsletter-queue-stats]]

## Sources

- `app/api/newsletter/stats/route.ts` (lines 1–225)
