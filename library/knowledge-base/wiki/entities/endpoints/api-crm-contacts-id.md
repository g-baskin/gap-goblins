---
type: entity
entity_type: endpoint
title: "CRM Single Contact"
path: "app/api/crm/contacts/[id]/route.ts"
route_path: /api/crm/contacts/[id]
http_methods:
  - GET
  - PATCH
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/contacts/[id]/route.ts
    lines: "1-197"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-crm-status]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-crm-contacts]]"
  - "[[entities/endpoints/api-crm-deals-id]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Single Contact

`GET /api/crm/contacts/[id]` fetches a single contact by ID with its tags, deals, and most recent 20 timeline entries. `PATCH` performs a partial update: all provided fields are merged; when `status` is included it is validated against the allowed status hierarchy (subscriber < lead < qualified < customer) and a timeline entry is appended (`app/api/crm/contacts/[id]/route.ts:80-162`). Updates that would downgrade status are rejected with HTTP 400. Requires admin session.
