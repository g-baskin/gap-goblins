---
type: entity
title: "authConfig"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/auth.config.ts"
language: ts
depends_on:
  - "[[entities/AUTH_SECRET-env-var]]"
used_by:
  - "[[entities/auth-module]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - auth
related:
  - "[[concepts/jwt-session-revocation-password-changed-at]]"
sources:
  - "lib/auth.config.ts"
---

# authConfig

## Overview

Edge-safe NextAuth configuration imported by `proxy.ts`. Must not transitively import Node-only modules (`lib/auth.config.ts:26-37`).

## Exports

- `authConfig: NextAuthConfig` — JWT session strategy, cookie names, empty providers array (`lib/auth.config.ts:38-99`).

## Behavior

- **JWT callback** stores `id`, `role`, `totpEnabled`, `passwordChangedAt` on sign-in (`lib/auth.config.ts:51-59`).
- **Session callback** copies `id`, `role`, `totpEnabled` to session user (`lib/auth.config.ts:62-68`).
- **Secret:** `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET` (`lib/auth.config.ts:39`).
- **Session maxAge:** `SESSION_MAX_AGE_SECONDS` from constants (`lib/auth.config.ts:76-79`).

Full Credentials provider and password-revocation JWT logic live in [[entities/auth-module]].

## Connections

- **depends_on:** [[entities/AUTH_SECRET-env-var]]
- **used_by:** [[entities/auth-module]]

## Sources

- `lib/auth.config.ts` (lines 1–99)
