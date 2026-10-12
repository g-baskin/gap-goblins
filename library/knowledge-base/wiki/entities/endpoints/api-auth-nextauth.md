---
type: entity
entity_type: endpoint
title: "NextAuth Route Handler"
path: "app/api/auth/[...nextauth]/route.ts"
route_path: /api/auth/[...nextauth]
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
  - path: app/api/auth/[...nextauth]/route.ts
    lines: "1-3"
depends_on:
  - "[[entities/lib-auth]]"
related: []
tags:
  - entity
  - endpoint
  - auth
---

# NextAuth Route Handler

Re-exports the `GET` and `POST` handlers from `@/lib/auth` (NextAuth v5) at the standard catch-all route `app/api/auth/[...nextauth]/route.ts:3`. This single file delegates all session, credential, and TOTP verification logic to the centralised `handlers` object; it contains no application logic of its own.
