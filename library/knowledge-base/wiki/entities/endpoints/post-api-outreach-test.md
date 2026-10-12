---
type: entity
entity_type: endpoint
title: "Outreach Test Ping"
path: "app/api/outreach/test/route.ts"
route_path: /api/outreach/test
http_methods:
  - GET
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/test/route.ts
    lines: "1-15"
depends_on: []
related:
  - "[[entities/endpoints/get-api-outreach-health]]"
tags:
  - entity
  - endpoint
  - outreach
  - debug
---

# Outreach Test Ping

`GET /api/outreach/test` is a trivial ping endpoint that returns `{ ok: true, ts: <isoTimestamp> }`. No authentication, no database access. Used to quickly verify that the outreach API surface is reachable without executing any business logic.
