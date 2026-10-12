---
type: entity
title: newsletter-verification-token module
entity_type: module
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/newsletter/verification-token.ts
language: ts
used_by:
  - "[[entities/modules/newsletter-subscribers]]"
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - newsletter
sources:
  - lib/newsletter/verification-token.ts
partial_scan: true
---

# newsletter-verification-token module

## Overview

Generates 32-byte base64url verification tokens with 24-hour expiry for double opt-in (`lib/newsletter/verification-token.ts`).

## Signature / Definition

```ts
VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000
generateVerificationToken(): string
tokenExpiresAt(): string
isTokenExpired(expiresAt: string | null | undefined): boolean
```

## Sources

- `lib/newsletter/verification-token.ts` (lines 1-16)
