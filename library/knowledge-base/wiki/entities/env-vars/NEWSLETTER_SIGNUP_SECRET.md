---
type: entity
title: NEWSLETTER_SIGNUP_SECRET
entity_type: env-var
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: .env.example
language: other
read_at:
  - app/api/newsletter/subscribe/route.ts
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - env-var
  - newsletter
related:
  - "[[entities/endpoints/post-api-newsletter-subscribe]]"
sources:
  - app/api/newsletter/subscribe/route.ts
  - .env.example
partial_scan: true
---

# NEWSLETTER_SIGNUP_SECRET

## Overview

Optional secret requiring `x-api-key` header on `POST /api/newsletter/subscribe` for external marketing sites (`app/api/newsletter/subscribe/route.ts:26-32`).

## Behavior

- When unset: subscribe endpoint is fully public (rate limit only).
- When set: missing or mismatched key returns `401 Unauthorized`.
- Compared via `compareApiKeys` (timing-safe).

## Sources

- `.env.example` — documented as optional
- `app/api/newsletter/subscribe/route.ts` (lines 26-32)
