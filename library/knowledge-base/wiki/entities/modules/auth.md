---
type: entity
title: "auth (Node NextAuth handlers)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/auth.ts"
language: ts
depends_on:
  - "[[entities/modules/auth-config]]"
  - "[[entities/modules/db-client]]"
  - "[[entities/functions/decryptCredential]]"
used_by:
  - "[[entities/endpoints/nextauth-handlers]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "app/__tests__/security/authentication.test.ts"
tags:
  - entity
  - auth
related:
  - "[[concepts/nextauth-proxy-split]]"
sources:
  - "lib/auth.ts"
---

# auth (Node NextAuth handlers)

## Overview

Full NextAuth setup for Node runtime: Credentials provider with bcrypt password verify, TOTP 2FA, account lockout, audit logging, and signOut event. Spreads `authConfig` and must never be imported by `proxy.ts` (`lib/auth.ts:20-27`).

## Signature / Definition

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({ ...authConfig, providers: [...], events: {...} });
```

## Behavior

- `authorize()` fetches admin user via Drizzle, verifies password with bcryptjs (`lib/auth.ts:60-130`).
- Failed attempts increment counter; lockout after `MAX_FAILED_LOGIN_ATTEMPTS` (`lib/auth.ts:109-122`).
- TOTP verification via otplib when `totpEnabled` (`lib/auth.ts:132-190`).
- Successful login resets failures and writes audit log (`lib/auth.ts:192-216`).
- `signOut` event logs logout to `adminAuditLog` (`lib/auth.ts:31-48`).

## Connections

- **depends_on:** [[entities/modules/auth-config]], [[entities/modules/db-client]]
- **related concepts:** [[concepts/nextauth-proxy-split]]

## History

- **Last touched:** `40438e4` (2026-05-27)

## Sources

- `lib/auth.ts` (lines 1–232)
