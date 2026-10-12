---
type: entity
title: GET /api/newsletter/verify
entity_type: endpoint
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/verify/route.ts
language: ts
depends_on:
  - "[[entities/modules/newsletter-subscribers]]"
used_by:
  - "[[entities/pages/newsletter-verify-page]]"
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - endpoint
  - newsletter
related:
  - "[[concepts/newsletter-double-opt-in-flow]]"
sources:
  - app/api/newsletter/verify/route.ts
partial_scan: true
---

# GET /api/newsletter/verify

## Overview

Verifies subscriber email by token query param, syncs CRM inline, enqueues retry on sync failure (`app/api/newsletter/verify/route.ts:14-44`).

## Behavior

| Token state | HTTP | Body |
|---|---|---|
| Missing | 400 | `{ status: "invalid" }` |
| Invalid/expired | 410 | `{ status: "expired" }` |
| Valid | 200 | `{ status: "verified" }` |
| Server error | 500 | `{ status: "error" }` |

Calls `verifySubscriberByToken` then `syncVerifiedSubscriber`; on sync throw, `enqueueCrmOperation("newsletter_subscriber_sync", …)` (`:28-38`).

## Connections

- **depends_on:** [[entities/functions/syncVerifiedSubscriber]], [[entities/functions/verifySubscriberByToken]]
- **used_by:** `/newsletter/verify` page

## Sources

- `app/api/newsletter/verify/route.ts` (lines 14-44)
