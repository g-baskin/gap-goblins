---
type: entity
entity_type: endpoint
title: "Outreach Contacts Batch Fetch"
path: "app/api/outreach/contacts/batch/route.ts"
route_path: /api/outreach/contacts/batch
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/contacts/batch/route.ts
    lines: "1-75"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-contacts-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Contacts Batch Fetch

`GET /api/outreach/contacts/batch?campaignIds=id1,id2,…` fetches all outreach contacts across the listed campaigns in one query. Returns contacts grouped by `campaignId`. Designed for UI bulk-select scenarios where multiple campaigns' contact lists need to be loaded simultaneously (`app/api/outreach/contacts/batch/route.ts:15-70`). Requires admin session.
