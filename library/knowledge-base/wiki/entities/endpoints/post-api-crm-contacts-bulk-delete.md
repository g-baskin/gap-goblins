---
type: entity
entity_type: endpoint
title: "CRM Contacts Bulk Delete"
path: "app/api/crm/contacts/bulk-delete/route.ts"
route_path: /api/crm/contacts/bulk-delete
http_methods:
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/contacts/bulk-delete/route.ts
    lines: "1-66"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-crm-contacts]]"
  - "[[entities/endpoints/post-api-crm-deals-bulk-delete]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Contacts Bulk Delete

`DELETE /api/crm/contacts/bulk-delete` with body `{ ids: string[] }` hard-deletes CRM contacts in a single batched `db.delete().where(inArray(...))`. Cascades to associated deals and timeline entries via foreign-key constraints. Returns a count of deleted contacts. Requires admin session.
