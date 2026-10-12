---
type: entity
entity_type: endpoint
title: "Admin Invitations CRUD"
path: "app/api/admin/invitations/route.ts"
route_path: /api/admin/invitations
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
  - path: app/api/admin/invitations/route.ts
    lines: "1-206"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-rate-limit]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/post-api-admin-invitations-accept]]"
tags:
  - entity
  - endpoint
  - admin
  - auth
---

# Admin Invitations CRUD

`GET /api/admin/invitations` lists all invitations (any authenticated admin). `POST` creates a new invitation (super_admin only): generates a 32-byte random token, stores only its SHA-256 hash, and returns a signed invite URL (`app/api/admin/invitations/route.ts:36-157`). `DELETE ?id=…` revokes a pending invitation (super_admin only). The POST is rate-limited to 10 requests/hour/user. All three methods write to `admin_audit_log`.
