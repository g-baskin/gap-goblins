---
type: entity
title: "auth (NextAuth)"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/auth.ts"
language: ts
depends_on:
  - "[[entities/authConfig-module]]"
  - "[[entities/adminUsers-data-model]]"
used_by:
  - "[[entities/endpoints/api-admin-site-settings]]"
  - "[[entities/POST-api-newsletter-settings]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - auth
related:
  - "[[concepts/jwt-session-revocation-password-changed-at]]"
sources:
  - "lib/auth.ts"
---

# auth (NextAuth)

## Overview

Full NextAuth setup — Node runtime only. Spreads [[entities/authConfig-module]] and adds Credentials provider, audit logging, and JWT password-change revocation (`lib/auth.ts:20-27`, `lib/auth.ts:230-269`).

## Exports

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({ ... })
```

## Behavior

### authorize (Credentials)

- Normalizes email, loads `admin_users`, verifies bcrypt password (`lib/auth.ts:66-107`).
- Enforces account lockout via `failedLoginAttempts` / `lockedUntil` (`lib/auth.ts:102-121`).
- Optional TOTP via encrypted `totpSecret` (`lib/auth.ts:133-189`).
- Returns user object including `passwordChangedAt` (`lib/auth.ts:218-225`).

### jwt callback (revocation)

After base JWT from authConfig, compares token `iat` to DB `passwordChangedAt`. If password changed after issue, clears `sub`/`id` and sets `exp: 0` (`lib/auth.ts:232-262`).

### events.signOut

Inserts `admin_audit_log` row with action `logout` (`lib/auth.ts:32-48`).

## Connections

- **concept:** [[concepts/jwt-session-revocation-password-changed-at]]
- **data model:** [[entities/adminUsers-data-model]]

## Sources

- `lib/auth.ts` (lines 1–275)
