---
type: entity
entity_type: endpoint
title: "CRM Contacts List / Create"
path: "app/api/crm/contacts/route.ts"
route_path: /api/crm/contacts
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
  - path: app/api/crm/contacts/route.ts
    lines: "1-250"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-crm-contacts-id]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Contacts List / Create

`GET /api/crm/contacts` returns paginated contacts with optional `search` (name/email/company), `status`, `tags` (comma-separated AND filter), `source`, `page`, and `limit` query params. `POST` creates a new contact with `createContactSchema` validation; duplicate email is caught and returns HTTP 409 (`app/api/crm/contacts/route.ts:170-228`). GET results include deal count and latest timeline event. Requires admin session.
