---
type: entity
entity_type: endpoint
title: "GET /api/newsletter"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/route.ts
language: ts
route_path: /api/newsletter
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterEditions]]"
related:
  - "[[entities/endpoints/api-newsletter-id]]"
  - "[[entities/endpoints/get-api-newsletter-stats]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/route.ts
    lines: "1-62"
---

# GET /api/newsletter

## Overview

Lists all newsletter editions for the admin dashboard (`app/api/newsletter/route.ts:9`). Returns up to 50 editions ordered by `createdAt` descending, projected to a compact shape with `id`, `subject`, `sentAt`, `status`, and a `stats` sub-object containing `openRate`, `clickRate`, and `totalRecipients`.

## Signature / Definition

```ts
GET /api/newsletter
Response: { success, newsletters: Array<{ id, subject, sentAt, status, stats: { openRate, clickRate, totalRecipients } }> }
```

## Behavior

Requires admin or super_admin session (`route.ts:20–23`). Fetches from `newsletterEditions` with `limit(50)` (`route.ts:27–29`). The stats projection normalises both camelCase and snake_case column names from the JSONB `stats` field to handle legacy rows (`route.ts:40–44`). Subjects default to `"Untitled"` when null.

## Connections

- **depends_on:** `newsletterEditions`
- **related:** [[entities/endpoints/api-newsletter-id]], [[entities/endpoints/get-api-newsletter-stats]]

## Sources

- `app/api/newsletter/route.ts` (lines 1–62)
