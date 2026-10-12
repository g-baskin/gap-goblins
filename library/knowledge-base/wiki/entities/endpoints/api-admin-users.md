---
type: entity
entity_type: endpoint
title: "Admin Users List"
path: "app/api/admin/users/route.ts"
route_path: /api/admin/users
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/users/route.ts
    lines: "1-50"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-admin-invitations]]"
tags:
  - entity
  - endpoint
  - admin
---

# Admin Users List

`GET /api/admin/users` returns a list of all active admin users (excluding deleted/suspended), projecting `id`, `name`, `email`, `role`, `avatarUrl`, and `createdAt`. Requires admin/super_admin session. No pagination — the list is expected to remain small.
