---
type: entity
entity_type: endpoint
title: "CRM Pipeline Deals"
path: "app/api/crm/pipeline-deals/route.ts"
route_path: /api/crm/pipeline-deals
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/pipeline-deals/route.ts
    lines: "1-110"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-crm-deals]]"
  - "[[entities/endpoints/get-api-crm-metrics]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Pipeline Deals

`GET /api/crm/pipeline-deals` returns all stages of the `sales-pipeline` with their associated deals, ordered by stage position. Each stage includes the full list of deals with contact details and deal value, enabling the Kanban board view. Returns `{ pipeline: { name, slug, stages: [{ id, name, position, deals[] }] } }`. Requires admin session.
