---
type: entity
entity_type: endpoint
title: "CRM Deals Bulk Delete"
path: "app/api/crm/deals/bulk-delete/route.ts"
route_path: /api/crm/deals/bulk-delete
http_methods:
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/deals/bulk-delete/route.ts
    lines: "1-60"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-crm-deals]]"
  - "[[entities/endpoints/post-api-crm-contacts-bulk-delete]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Deals Bulk Delete

`DELETE /api/crm/deals/bulk-delete` with body `{ ids: string[] }` hard-deletes CRM deals in a single batch. Returns `{ deleted: number }`. Requires admin session.
