---
type: entity
entity_type: endpoint
title: "Admin Security Reset Password"
path: "app/api/admin/security/reset-password/route.ts"
route_path: /api/admin/security/reset-password
http_methods:
  - GET
  - POST
  - PUT
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/security/reset-password/route.ts
    lines: "1-309"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-password]]"
  - "[[entities/lib-rate-limit]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/put-api-admin-security-password]]"
tags:
  - entity
  - endpoint
  - admin
  - security
---

# Admin Security Reset Password

Three-method public reset flow. `GET ?token=…` validates a reset token without consuming it. `POST { email }` generates a new token, invalidates existing ones, and sends a Resend password reset email; always returns success to prevent email enumeration (`app/api/admin/security/reset-password/route.ts:60-223`). `PUT { token, password }` redeems the token, hashes the new password, resets failed-login counters, and writes an audit log entry (`app/api/admin/security/reset-password/route.ts:227-308`). Tokens expire in 1 hour. Rate-limited to 5 requests/hour/IP.
