---
type: entity
title: UNSUBSCRIBE_SECRET
entity_type: env-var
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/newsletter/unsubscribe-token.ts
language: other
read_at:
  - lib/newsletter/unsubscribe-token.ts
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - env-var
  - newsletter
related:
  - "[[entities/modules/newsletter-unsubscribe-token]]"
sources:
  - lib/newsletter/unsubscribe-token.ts
partial_scan: true
---

# UNSUBSCRIBE_SECRET

## Overview

HMAC secret for newsletter unsubscribe link tokens. Required in production; falls back to `AUTH_SECRET` if unset (`lib/newsletter/unsubscribe-token.ts:33-40`).

## Behavior

- Used by `buildNewsletterUnsubscribeToken` and `verifyNewsletterUnsubscribeToken`.
- Token format: `v1.{base64url_hmac}`.
- Throws at runtime if neither `UNSUBSCRIBE_SECRET` nor `AUTH_SECRET` is configured.

## Sources

- `lib/newsletter/unsubscribe-token.ts` (lines 5-40)
- `.env.example`
