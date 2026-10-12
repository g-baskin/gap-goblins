---
type: entity
title: "adminUsers (Drizzle model)"
entity_type: data-model
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/schema.ts"
language: ts
schema_library: drizzle
fields:
  - id
  - email
  - passwordHash
  - passwordChangedAt
  - role
  - totpEnabled
depends_on: []
used_by:
  - "[[entities/auth-module]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - database
  - auth
related:
  - "[[entities/admin-users-sql-table]]"
sources:
  - "lib/db/schema.ts"
---

# adminUsers (Drizzle model)

## Overview

Drizzle definition for admin authentication users. Includes unique email index and `passwordChangedAt` for JWT invalidation (`lib/db/schema.ts:90-113`).

## Fields (selected)

| Field | Column | Purpose |
|-------|--------|---------|
| email | email | Login identifier; unique index |
| passwordHash | password_hash | bcrypt hash |
| passwordChangedAt | password_changed_at | Compared to JWT `iat` in `lib/auth.ts:252-262` |
| role | role | `admin` \| `super_admin` default `admin` |

## Connections

- **sql-table pair:** [[entities/admin-users-sql-table]]
- **used_by:** [[entities/auth-module]], [[entities/POST-api-admin-invitations-accept]]

## Sources

- `lib/db/schema.ts` (lines 88–113)
