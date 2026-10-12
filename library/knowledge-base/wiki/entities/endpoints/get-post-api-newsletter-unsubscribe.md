---
type: entity
title: GET/POST /api/newsletter/unsubscribe
entity_type: endpoint
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/unsubscribe/route.ts
language: ts
depends_on:
  - "[[entities/modules/newsletter-unsubscribe-token]]"
  - "[[entities/modules/newsletter-subscribers]]"
last_commit_hash: uncommitted-2026-05-28
tested_by:
  - app/api/newsletter/unsubscribe/__tests__/route.test.ts
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - app/api/newsletter/unsubscribe/route.ts
partial_scan: true
---

# GET/POST /api/newsletter/unsubscribe

## Overview

RFC 8058 one-click unsubscribe handler. Validates HMAC token then calls `unsubscribeSubscriber` (`app/api/newsletter/unsubscribe/route.ts:13-43`).

## Behavior

| Condition | Status | Response |
|---|---|---|
| Missing id/token | 400 | `{ error: "Missing id or token" }` |
| Invalid HMAC | 403 | `{ error: "Invalid unsubscribe token" }` |
| Subscriber not found | 404 | `{ error: "Subscriber not found" }` |
| Success | 200 | `{ success: true }` |

Both GET and POST delegate to `handleUnsubscribe`.

## Sources

- `app/api/newsletter/unsubscribe/route.ts` (lines 13-43)
