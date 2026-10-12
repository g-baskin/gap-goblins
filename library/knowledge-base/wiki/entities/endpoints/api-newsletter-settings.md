---
type: entity
entity_type: endpoint
title: "GET/POST /api/newsletter/settings"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/settings/route.ts
language: ts
route_path: /api/newsletter/settings
http_methods:
  - GET
  - POST
auth_required: false
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterSettings]]"
related:
  - "[[entities/endpoints/get-api-newsletter-health]]"
  - "[[entities/endpoints/api-newsletter]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/settings/route.ts
    lines: "1-189"
---

# GET/POST /api/newsletter/settings

## Overview

Reads and writes newsletter branding, sender, template, and footer configuration stored in the `newsletterSettings` table (`app/api/newsletter/settings/route.ts:70`). GET does not require authentication and returns hardcoded defaults merged with database overrides. POST requires admin session and deep-merges the incoming payload with existing values before persisting.

## Signature / Definition

```ts
GET  /api/newsletter/settings  → NewsletterSettings (branding, sender, template, footer)
POST /api/newsletter/settings
  Body: NewsletterSettings
  Response: { message, settings: NewsletterSettings }
```

## Behavior

`getDefaultSettings()` provides baseline values including placeholder tokens for domain, brand, and cal link (`route.ts:36–64`). GET merges DB row onto defaults via spread (`route.ts:80–84`). POST validates email addresses with a regex (`route.ts:125–130`), upserts using `UPDATE` if a row exists or `INSERT` if not (`route.ts:152–172`). The `auth_required` flag above applies only to POST; GET is unauthenticated.

## Connections

- **depends_on:** `newsletterSettings`
- **related:** [[entities/endpoints/get-api-newsletter-health]], [[entities/endpoints/api-newsletter]]

## Sources

- `app/api/newsletter/settings/route.ts` (lines 1–189)
