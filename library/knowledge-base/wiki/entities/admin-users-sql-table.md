---
type: entity
title: "admin_users (SQL table)"
entity_type: sql-table
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/schema.ts"
language: ts
dialect: postgres
columns:
  - id
  - email
  - password_hash
  - password_changed_at
  - role
  - totp_enabled
primary_key: id
data_model: "[[entities/adminUsers-data-model]]"
depends_on: []
used_by:
  - "[[entities/auth-module]]"
  - "[[entities/POST-api-admin-invitations-accept]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - database
  - auth
related:
  - "[[concepts/jwt-session-revocation-password-changed-at]]"
sources:
  - "lib/db/schema.ts"
  - "lib/db/drizzle/0014_invitation_and_auth_hardening.sql"
---

# admin_users (SQL table)

## Overview

Stores admin panel credentials, lockout state, TOTP secrets, and `password_changed_at` used for JWT session invalidation (`lib/db/schema.ts:90-113`, `lib/auth.ts:246-262`).

## DDL

Migration `0014_invitation_and_auth_hardening.sql` deduplicates by lowercased email then adds unique index `admin_users_email_unique_idx` (`lib/db/drizzle/0014_invitation_and_auth_hardening.sql:1-15`).

Drizzle mirrors the index at `lib/db/schema.ts:112`.

## Columns (key)

| Column | Type | Notes |
|--------|------|-------|
| email | text NOT NULL | Unique via `admin_users_email_unique_idx` |
| password_hash | text NOT NULL | bcrypt |
| password_changed_at | timestamptz | Session revocation anchor (`lib/db/schema.ts:105`) |
| failed_login_attempts | integer | Lockout counter (`lib/auth.ts:111-121`) |
| locked_until | timestamptz | |
| totp_enabled / totp_secret | boolean / text | Encrypted envelope supported (`lib/auth.ts:147-161`) |

## Connections

- **data_model:** [[entities/adminUsers-data-model]]
- **related concept:** [[concepts/jwt-session-revocation-password-changed-at]]

## Sources

- `lib/db/schema.ts` (lines 88–113)
- `lib/db/drizzle/0014_invitation_and_auth_hardening.sql`
