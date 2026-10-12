---
type: entity
entity_type: endpoint
title: "CRM Single Deal"
path: "app/api/crm/deals/[id]/route.ts"
route_path: /api/crm/deals/[id]
http_methods:
  - GET
  - PATCH
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/deals/[id]/route.ts
    lines: "1-181"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-crm-deals]]"
  - "[[entities/endpoints/post-api-crm-deals-id-move]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Single Deal

`GET /api/crm/deals/[id]` fetches a deal with its associated contact and stage details. `PATCH` updates deal fields (title, value, notes, expectedCloseDate, tags); it does NOT move the stage — use the `/move` sub-route for that. `DELETE` hard-deletes the deal and appends a timeline entry to the contact record (`app/api/crm/deals/[id]/route.ts:116-180`). Requires admin session.
