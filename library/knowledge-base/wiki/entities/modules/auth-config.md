---
type: entity
title: "authConfig (Edge-safe NextAuth config)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/auth.config.ts"
language: ts
depends_on:
  - "[[entities/env-vars/AUTH_SECRET]]"
used_by:
  - "[[entities/modules/proxy]]"
  - "[[entities/modules/auth]]"
last_commit_hash: "54b4276b10c47fd6e7f61a071192fbefbb1cc075"
tested_by:
  - "[[entities/modules/auth-config]]"
tags:
  - entity
  - auth
related:
  - "[[concepts/nextauth-proxy-split]]"
sources:
  - "lib/auth.config.ts"
---

# authConfig (Edge-safe NextAuth config)

## Overview

`authConfig` is the Edge-safe NextAuth configuration object imported by `proxy.ts`. It declares session/JWT callbacks and cookie settings but intentionally leaves `providers: []` empty so bcrypt, postgres, and encryption never enter the edge bundle (`lib/auth.config.ts:25-72`).

## Signature / Definition

```ts
export const authConfig: NextAuthConfig = { ... }
```

Extended Session/User types at `lib/auth.config.ts:5-23`.

## Behavior

- JWT strategy with `SESSION_MAX_AGE_SECONDS` (`lib/auth.config.ts:74-77`).
- `authorized()` returns true — route protection handled in `proxy.ts` (`lib/auth.config.ts:46-48`).
- JWT/session callbacks copy `id`, `role`, `totpEnabled` onto session (`lib/auth.config.ts:50-67`).
- Production cookie name uses `__Secure-` prefix (`lib/auth.config.ts:79-95`).

## Connections

- **used_by:** [[entities/modules/proxy]], [[entities/modules/auth]]
- **related concepts:** [[concepts/nextauth-proxy-split]]

## History

- **Last touched:** `54b4276` (2026-05-27)

## Sources

- `lib/auth.config.ts` (lines 1–97)
