---
type: entity
title: "0014_invitation_and_auth_hardening.sql"
entity_type: sql-table
status: stub
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0014_invitation_and_auth_hardening.sql"
language: sql
source_extension: ".sql"
dialect: postgres
depends_on: []
used_by:
  - "[[entities/admin-users-sql-table]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - migration
  - stub
sources:
  - "lib/db/drizzle/0014_invitation_and_auth_hardening.sql"
---

# 0014_invitation_and_auth_hardening.sql

## Overview

Migration deduplicating admin users by email (case-insensitive) before adding unique index (`lib/db/drizzle/0014_invitation_and_auth_hardening.sql`).

## DDL summary

1. CTE `ranked` — `ROW_NUMBER() OVER (PARTITION BY lower(email) ...)`
2. `DELETE` duplicate rows keeping oldest
3. `CREATE UNIQUE INDEX admin_users_email_unique_idx ON admin_users (email)`

## Connections

- **target table:** [[entities/admin-users-sql-table]]

## Sources

- `lib/db/drizzle/0014_invitation_and_auth_hardening.sql`
