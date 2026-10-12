---
type: entity
entity_type: endpoint
title: "Outreach Blocklist"
path: "app/api/outreach/blocklist/route.ts"
route_path: /api/outreach/blocklist
http_methods:
  - GET
  - POST
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/blocklist/route.ts
    lines: "1-105"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/post-api-outreach-unsubscribe-contactid]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Blocklist

`GET /api/outreach/blocklist` returns a paginated list of blocked email addresses. `POST { email }` adds an email to the blocklist with source `"manual"`. `DELETE ?email=…` removes an email from the blocklist (`app/api/outreach/blocklist/route.ts:76-103`). All methods require admin session. Blocked addresses are checked by the sender before any outreach email is dispatched.
