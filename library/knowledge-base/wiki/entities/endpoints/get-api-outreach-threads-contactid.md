---
type: entity
entity_type: endpoint
title: "Outreach Threads Bulk Update by Contact"
path: "app/api/outreach/threads/[contactId]/route.ts"
route_path: /api/outreach/threads/[contactId]
http_methods:
  - PATCH
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/threads/[contactId]/route.ts
    lines: "1-70"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-replies-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Threads Bulk Update by Contact

`PATCH /api/outreach/threads/[contactId]` with body `{ isRead?, isArchived? }` bulk-updates all reply rows in `outreach_replies` that belong to the given contact. Useful for "mark all as read" and "archive thread" actions in the inbox UI. Returns `{ updated: number }`. Requires admin session.
