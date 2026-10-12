---
type: entity
entity_type: endpoint
title: "Admin Invitation Accept"
path: "app/api/admin/invitations/accept/route.ts"
route_path: /api/admin/invitations/accept
http_methods:
  - GET
  - POST
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/invitations/accept/route.ts
    lines: "1-198"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-password]]"
  - "[[entities/lib-rate-limit]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-admin-invitations]]"
tags:
  - entity
  - endpoint
  - admin
  - auth
---

# Admin Invitation Accept

`GET /api/admin/invitations/accept?token=…` validates an invitation token without consuming it, returning the invited email and role (`app/api/admin/invitations/accept/route.ts:153-198`). `POST` accepts the invitation: validates password strength, hashes the token for DB lookup, and within a single transaction creates the admin user, marks the invitation accepted, and writes an audit log entry (`app/api/admin/invitations/accept/route.ts:10-150`). Both paths are public (no session required). The POST is rate-limited to 5 requests/hour/IP to prevent brute-force token enumeration.
