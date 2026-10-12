---
type: entity
entity_type: endpoint
title: "GET/POST /api/newsletter/:id/preview"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/[id]/preview/route.ts
language: ts
route_path: /api/newsletter/:id/preview
http_methods:
  - GET
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterEditions]]"
  - "[[entities/newsletterCampaigns]]"
related:
  - "[[entities/api-newsletter-id]]"
  - "[[entities/get-api-newsletter-stats]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/[id]/preview/route.ts
    lines: "1-221"
---

# GET/POST /api/newsletter/:id/preview

## Overview

Returns an HTML + text preview of a newsletter edition by ID (`app/api/newsletter/[id]/preview/route.ts:9`). Both methods require an admin session; they differ in how personalization data is supplied — GET accepts a `?personalize=true` query param and substitutes a hardcoded sample name ("Sarah"), while POST accepts a JSON body with `{ firstName, email }` for custom preview data.

## Signature / Definition

```ts
// GET — query-param personalization
GET /api/newsletter/:id/preview?personalize=true

// POST — body-driven personalization
POST /api/newsletter/:id/preview
Body: { firstName?: string, email?: string }
Response: { success: true, preview: { id, subject, preheader, html, text, articleCount, status, campaign, ... } }
```

## Behavior

Both handlers fetch from `newsletterEditions` and optionally join `newsletterCampaigns` (`route.ts:50–71`). When personalization is active, `{{first_name}}` and `{{unsubscribe_url}}` template tokens are replaced in `contentHtml` and `contentText` (`route.ts:80–87`). Returns 401 if unauthenticated, 403 if non-admin, 400 for an invalid ID, and 404 if the edition does not exist.

## Connections

- **depends_on:** `newsletterEditions`, `newsletterCampaigns` (schema tables)
- **related:** [[entities/endpoints/api-newsletter-id]], [[entities/endpoints/get-api-newsletter-stats]]

## Sources

- `app/api/newsletter/[id]/preview/route.ts` (lines 1–221)
