---
type: entity
entity_type: endpoint
title: "Outreach Single Contact"
path: "app/api/outreach/contacts/[contactId]/route.ts"
route_path: /api/outreach/contacts/[contactId]
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
  - path: app/api/outreach/contacts/[contactId]/route.ts
    lines: "1-140"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Single Contact

`GET /api/outreach/contacts/[contactId]` returns an outreach contact (from `outreach_contacts`) with its campaign name. `PATCH` updates mutable fields: firstName, lastName, company, title, status, metadata, notes. `DELETE` hard-removes the contact row; the campaign contact count is decremented via trigger or application logic (`app/api/outreach/contacts/[contactId]/route.ts:70-137`). Requires admin session.
