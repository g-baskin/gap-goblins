---
type: entity
entity_type: endpoint
title: "Admin Security Sessions"
path: "app/api/admin/security/sessions/route.ts"
route_path: /api/admin/security/sessions
http_methods:
  - GET
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/security/sessions/route.ts
    lines: "1-121"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-rate-limit]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - security
---

# Admin Security Sessions

`GET /api/admin/security/sessions` lists non-expired sessions for the current user from `admin_sessions`. `DELETE ?id=…` revokes a specific session row and then advances `passwordChangedAt` on the user row (`app/api/admin/security/sessions/route.ts:82-92`), which causes the JWT callback to reject all tokens issued before that timestamp — effectively signing out all devices. Rate-limited to 10 requests/15 min. Action is audit-logged.
