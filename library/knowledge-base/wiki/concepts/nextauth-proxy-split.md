---
type: concept
title: "NextAuth proxy vs auth.ts split"
complexity: intermediate
domain: authentication
aliases:
  - "auth.config vs auth.ts"
  - "edge-safe NextAuth"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - auth
related:
  - "[[entities/modules/proxy]]"
  - "[[entities/modules/auth-config]]"
  - "[[entities/modules/auth]]"
sources:
  - "lib/auth.config.ts"
  - "lib/auth.ts"
  - "proxy.ts"
---

# NextAuth proxy vs auth.ts split

## Definition

Authentication is split across two NextAuth instantiations: Edge-safe `authConfig` in `lib/auth.config.ts` (used by `proxy.ts`) and the full Node setup in `lib/auth.ts` (Credentials provider, bcrypt, Drizzle, encryption).

## How it works

```
Request → proxy.ts
            └─ NextAuth(authConfig)     ← no bcrypt/db/crypto
Route handlers → lib/auth.ts
            └─ NextAuth({ ...authConfig, providers, events })
```

`proxy.ts:6-9` documents that importing `lib/auth.ts` would pull bcryptjs, postgres.js, and node:crypto into the edge bundle. `auth.config.ts:25-36` lists forbidden transitive imports. `auth.ts:25-26` states it must never be imported by `proxy.ts`.

## Why it matters

Violating the split breaks Next.js edge deployment or inflates the proxy bundle. Session shape stays consistent because both spread the same JWT/session callbacks from `authConfig`.

## Examples in this codebase

- [[entities/modules/proxy]] — session gate + CSP on admin routes
- [[entities/modules/auth]] — credential verification and audit logging

## Connections

- **involves entities:** [[entities/modules/auth-config]], [[entities/modules/auth]], [[entities/modules/proxy]]

## Sources

- `lib/auth.config.ts` (lines 25–72)
- `lib/auth.ts` (lines 20–27)
- `proxy.ts` (lines 6–9)
