---
type: concept
title: "JWT session revocation via passwordChangedAt"
complexity: intermediate
domain: auth
aliases:
  - "password change invalidates sessions"
  - "JWT iat revocation"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - concept
  - auth
  - security
related:
  - "[[entities/auth-module]]"
  - "[[entities/authConfig-module]]"
  - "[[entities/adminUsers-data-model]]"
sources:
  - "lib/auth.ts"
  - "lib/auth.config.ts"
---

# JWT session revocation via passwordChangedAt

## Definition

Admin sessions use JWT strategy (not server-side session store). When a user's password changes, all previously issued JWTs are invalidated by comparing token `iat` to `admin_users.password_changed_at` on every JWT refresh (`lib/auth.ts:232-262`).

## How it works

```
Sign-in (authorize)
  → returns user.passwordChangedAt from DB (lib/auth.ts:224)

JWT callback (authConfig)
  → copies passwordChangedAt onto token (lib/auth.config.ts:56)

JWT callback (auth.ts extension)
  → if passwordChangedAt > token.iat * 1000:
       return { ...token, exp: 0, sub: undefined, id: undefined }
     (lib/auth.ts:252-261)
```

Edge middleware uses [[entities/authConfig-module]] only (no DB). Full revocation check runs in Node [[entities/auth-module]] JWT callback where `db` is available (`lib/auth.config.ts:26-37`, `lib/auth.ts:245-265`).

## Why it matters

Without this check, a stolen JWT remains valid until natural expiry even after password reset or admin lockout remediation.

## Examples in this codebase

- [[entities/adminUsers-data-model]] — `passwordChangedAt` column
- [[entities/auth-module]] — revocation implementation

## Connections

- **involves entities:** [[entities/auth-module]], [[entities/authConfig-module]], [[entities/admin-users-sql-table]]

## Sources

- `lib/auth.ts` (lines 218–265)
- `lib/auth.config.ts` (lines 51–59)
- `lib/db/schema.ts` (line 105)
