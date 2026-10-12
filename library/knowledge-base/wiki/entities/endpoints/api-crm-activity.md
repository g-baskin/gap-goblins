---
type: entity
entity_type: endpoint
title: "CRM Global Activity Feed"
path: "app/api/crm/activity/route.ts"
route_path: /api/crm/activity
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/activity/route.ts
    lines: "1-90"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-crm-contacts-id]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Global Activity Feed

`GET /api/crm/activity` queries the `contact_timeline` table for all timeline entries across every contact, ordered by `created_at` descending. Accepts `limit` (default 50, max 200) and `cursor` (ISO timestamp) query params for keyset pagination (`app/api/crm/activity/route.ts:22-65`). Returns items with joined `contact` name/email for display. Requires admin session.
