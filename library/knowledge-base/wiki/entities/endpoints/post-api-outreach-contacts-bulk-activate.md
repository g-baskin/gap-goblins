---
type: entity
entity_type: endpoint
title: "Outreach Contacts Bulk Activate"
path: "app/api/outreach/contacts/bulk/activate/route.ts"
route_path: /api/outreach/contacts/bulk/activate
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/contacts/bulk/activate/route.ts
    lines: "1-70"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-contacts-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Contacts Bulk Activate

`POST /api/outreach/contacts/bulk/activate` with body `{ contactIds: string[] }` sets `status = "active"` on all listed outreach contacts, making them eligible for the next outreach processing run. Returns `{ activated: number }`. Requires admin session.
