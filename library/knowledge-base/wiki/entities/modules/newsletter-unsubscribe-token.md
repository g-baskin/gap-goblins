---
type: entity
title: newsletter-unsubscribe-token module
entity_type: module
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/newsletter/unsubscribe-token.ts
language: ts
depends_on:
  - "[[entities/env-vars/UNSUBSCRIBE_SECRET]]"
used_by:
  - "[[entities/modules/newsletter-subscribers]]"
  - "[[entities/endpoints/get-post-api-newsletter-unsubscribe]]"
last_commit_hash: uncommitted-2026-05-28
tested_by:
  - lib/newsletter/__tests__/unsubscribe-token.test.ts
tags:
  - entity
  - newsletter
sources:
  - lib/newsletter/unsubscribe-token.ts
partial_scan: true
---

# newsletter-unsubscribe-token module

## Overview

HMAC-SHA256 signed tokens for newsletter unsubscribe URLs, mirroring automation unsubscribe pattern (`lib/newsletter/unsubscribe-token.ts`).

## Signature / Definition

```ts
buildNewsletterUnsubscribeToken(subscriberId: string): string
verifyNewsletterUnsubscribeToken(subscriberId: string, token: string | null | undefined): boolean
```

Verification uses `timingSafeEqual` on base64url digests (`:21-26`).

## Sources

- `lib/newsletter/unsubscribe-token.ts` (lines 1-41)
