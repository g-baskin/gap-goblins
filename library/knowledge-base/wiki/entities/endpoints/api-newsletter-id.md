---
type: entity
entity_type: endpoint
title: "GET/PATCH/DELETE /api/newsletter/:id"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/[id]/route.ts
language: ts
route_path: /api/newsletter/:id
http_methods:
  - GET
  - PATCH
  - DELETE
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/newsletterEditions]]"
  - "[[entities/newsletterCampaigns]]"
  - "[[entities/adminAuditLog]]"
  - "[[entities/updateNewsletterSchema]]"
related:
  - "[[entities/endpoints/api-newsletter]]"
  - "[[entities/endpoints/post-api-newsletter-id-send]]"
  - "[[entities/endpoints/get-post-api-newsletter-id-preview]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/[id]/route.ts
    lines: "1-295"
---

# GET/PATCH/DELETE /api/newsletter/:id

## Overview

Single-resource handler for newsletter editions (`app/api/newsletter/[id]/route.ts`). GET returns the full edition including HTML/text content and associated campaign; PATCH performs a partial update validated by `updateNewsletterSchema` and writes an audit log entry; DELETE hard-deletes the edition but only when its status is `"draft"` — non-draft editions are rejected with 400.

## Signature / Definition

```ts
GET    /api/newsletter/:id   → { success, newsletter: { id, campaignId, campaign, subject, preheader, contentHtml, contentText, stats, ... } }
PATCH  /api/newsletter/:id   Body: { subject?, preheader?, contentHtml?, contentText?, status?, scheduledAt? }
DELETE /api/newsletter/:id   → { success, message }  (draft only)
```

## Behavior

All three handlers require admin or super_admin role (`route.ts:32–37`). PATCH builds a partial update object, runs `db.update(newsletterEditions)`, and inserts a `newsletter_updated` audit log row (`route.ts:183–189`). DELETE checks `edition.status !== "draft"` before deleting and logs `newsletter_deleted` (`route.ts:258–278`). PATCH is validated via `parseBody(request, updateNewsletterSchema)` (`route.ts:152`).

## Connections

- **depends_on:** `newsletterEditions`, `newsletterCampaigns`, `adminAuditLog`, `updateNewsletterSchema`
- **related:** [[entities/endpoints/api-newsletter]], [[entities/endpoints/post-api-newsletter-id-send]]

## Sources

- `app/api/newsletter/[id]/route.ts` (lines 1–295)
