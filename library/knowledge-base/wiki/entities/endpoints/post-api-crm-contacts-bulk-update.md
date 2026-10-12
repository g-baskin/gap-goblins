---
type: entity
entity_type: endpoint
title: "CRM Contacts Bulk Update"
path: "app/api/crm/contacts/bulk-update/route.ts"
route_path: /api/crm/contacts/bulk-update
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/contacts/bulk-update/route.ts
    lines: "1-97"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-crm-status]]"
related:
  - "[[entities/endpoints/api-crm-contacts]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Contacts Bulk Update

`POST /api/crm/contacts/bulk-update` with body `{ ids: string[], updates: { status?, tags?, addTags?, removeTags? } }` applies the same mutations to a batch of contacts. Status changes are validated against the hierarchy (no downgrades). Tag operations support `addTags` (union) and `removeTags` (difference) alongside a full `tags` replacement (`app/api/crm/contacts/bulk-update/route.ts:33-78`). Returns `updatedCount`. Requires admin session.
