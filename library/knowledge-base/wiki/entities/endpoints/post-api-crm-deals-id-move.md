---
type: entity
entity_type: endpoint
title: "CRM Deal Move Stage"
path: "app/api/crm/deals/[id]/move/route.ts"
route_path: /api/crm/deals/[id]/move
http_methods:
  - PATCH
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/deals/[id]/move/route.ts
    lines: "1-120"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-crm-stage-rules]]"
related:
  - "[[entities/endpoints/api-crm-deals-id]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Deal Move Stage

`PATCH /api/crm/deals/[id]/move` with body `{ stageId }` moves a deal to the target stage. It enforces the `sales-pipeline` stage rules: the "Meeting Booked" stage can only be entered via a Cal.com webhook, not via this endpoint — the API returns HTTP 403 if the target stage maps to that slug (`app/api/crm/deals/[id]/move/route.ts:44-60`). On success it appends a stage-change entry to `contact_timeline` and returns the updated deal. Requires admin session.
