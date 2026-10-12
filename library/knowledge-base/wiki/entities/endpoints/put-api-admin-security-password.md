---
type: entity
entity_type: endpoint
title: "Admin Security Change Password"
path: "app/api/admin/security/password/route.ts"
route_path: /api/admin/security/password
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/security/password/route.ts
    lines: "1-102"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-password]]"
  - "[[entities/lib-rate-limit]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-admin-security-reset-password]]"
tags:
  - entity
  - endpoint
  - admin
  - security
---

# Admin Security Change Password

`POST /api/admin/security/password` allows an authenticated admin to change their own password by supplying `currentPassword` and `newPassword` (`app/api/admin/security/password/route.ts:11-102`). Verifies the current password with `verifyPassword` before hashing and persisting the new one. Rate-limited to 3 requests/hour/user. The action is written to `admin_audit_log`.
