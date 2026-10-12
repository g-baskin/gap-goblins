---
type: entity
entity_type: endpoint
title: "CRM Deals List / Create"
path: "app/api/crm/deals/route.ts"
route_path: /api/crm/deals
http_methods:
  - GET
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/deals/route.ts
    lines: "1-200"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-crm-deals-id]]"
  - "[[entities/endpoints/get-api-crm-pipeline-deals]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Deals List / Create

`GET /api/crm/deals` returns paginated deals with optional `stageId`, `contactId`, `search`, `page`, and `limit` filters; each row includes the stage name and contact email. `POST` creates a new deal, validates with `createDealSchema`, and appends an entry to `contact_timeline`. Returns the created deal with stage and contact details. Requires admin session.
