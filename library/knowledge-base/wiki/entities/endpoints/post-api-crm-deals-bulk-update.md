---
type: entity
entity_type: endpoint
title: "CRM Deals Bulk Update"
path: "app/api/crm/deals/bulk-update/route.ts"
route_path: /api/crm/deals/bulk-update
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/deals/bulk-update/route.ts
    lines: "1-80"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-crm-deals]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Deals Bulk Update

`POST /api/crm/deals/bulk-update` with body `{ ids: string[], updates: { stageId?, tags?, value?, expectedCloseDate? } }` applies the same field values to all listed deals. Returns `{ updated: number }`. Stage moves via this endpoint do not enforce the Meeting Booked protection — use the single-deal `/move` route for guarded stage transitions. Requires admin session.
