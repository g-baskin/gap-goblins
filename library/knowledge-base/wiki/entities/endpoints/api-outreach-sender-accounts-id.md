---
type: entity
entity_type: endpoint
title: "Outreach Sender Account Update"
path: "app/api/outreach/sender-accounts/[id]/route.ts"
route_path: /api/outreach/sender-accounts/[id]
http_methods:
  - PATCH
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/sender-accounts/[id]/route.ts
    lines: "1-70"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-sender-accounts]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Sender Account Update

`PATCH /api/outreach/sender-accounts/[id]` updates the `signature` and `signatureHtml` fields of an existing sender account (`app/api/outreach/sender-accounts/[id]/route.ts:14-64`). Only signature fields are mutable via this route; email address and name are immutable. Returns the updated sender account. Requires admin session.
