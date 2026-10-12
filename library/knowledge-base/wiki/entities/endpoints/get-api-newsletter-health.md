---
type: entity
entity_type: endpoint
title: "GET /api/newsletter/health"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/health/route.ts
language: ts
route_path: /api/newsletter/health
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/RESEND_API_KEY]]"
  - "[[entities/NEWSLETTER_FROM_EMAIL]]"
  - "[[entities/NEXT_PUBLIC_SITE_URL]]"
related:
  - "[[entities/endpoints/api-newsletter-settings]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/health/route.ts
    lines: "1-104"
---

# GET /api/newsletter/health

## Overview

Admin-only diagnostic endpoint that checks whether the newsletter email service is correctly configured (`app/api/newsletter/health/route.ts:9`). Reports the status of three environment variables — `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, and `NEXT_PUBLIC_SITE_URL` — and produces a prioritised recommendations list when any are missing.

## Signature / Definition

```ts
GET /api/newsletter/health
Response: {
  status: "healthy" | "unhealthy",
  checks: { resend: { configured, status, message }, fromEmail: {...}, siteUrl: {...} },
  recommendations: Array<{ severity: "critical"|"warning", message, action }>
}
```

## Behavior

Reads env vars directly at request time (`route.ts:28–33`); no database queries are executed. The overall `status` is `"healthy"` only if `RESEND_API_KEY` is present — other missing vars produce `"warning"` recommendations rather than flipping the top-level status to unhealthy (`route.ts:35–57`). Requires admin or super_admin role; otherwise returns 401/403.

## Connections

- **depends_on:** env vars `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`
- **related:** [[entities/endpoints/api-newsletter-settings]]

## Sources

- `app/api/newsletter/health/route.ts` (lines 1–104)
