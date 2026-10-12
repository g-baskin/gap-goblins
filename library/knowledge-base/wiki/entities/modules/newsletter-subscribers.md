---
type: entity
title: newsletter-subscribers module
entity_type: module
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/newsletter/subscribers.ts
language: ts
depends_on:
  - "[[entities/data-models/newsletter-subscribers-table]]"
  - "[[entities/modules/newsletter-verification-token]]"
  - "[[entities/modules/newsletter-unsubscribe-token]]"
used_by:
  - "[[entities/endpoints/post-api-newsletter-subscribe]]"
  - "[[entities/endpoints/get-api-newsletter-verify]]"
  - "[[entities/endpoints/get-post-api-newsletter-unsubscribe]]"
  - "[[entities/endpoints/api-admin-subscribers]]"
last_commit_hash: uncommitted-2026-05-28
tested_by:
  - lib/newsletter/__tests__/subscribers.test.ts
tags:
  - entity
  - newsletter
related:
  - "[[concepts/newsletter-double-opt-in-flow]]"
sources:
  - lib/newsletter/subscribers.ts
partial_scan: true
---

# newsletter-subscribers module

## Overview

Central domain module for newsletter subscriber lifecycle: pending upsert, confirmation email, token verification, CRM/automation sync, and unsubscribe with enrollment cleanup (`lib/newsletter/subscribers.ts:1-262`).

## Signature / Definition

Exported functions:

```ts
createOrRefreshPendingSubscriber(input: SubscribeInput): Promise<SubscriberRow>
sendConfirmationEmail(subscriber: SubscriberRow): Promise<void>
verifySubscriberByToken(token: string): Promise<SubscriberRow | null>
syncVerifiedSubscriber(subscriber: SubscriberRow): Promise<void>
unsubscribeSubscriber(subscriberId: string): Promise<boolean>
```

## Behavior

- Normalizes email to lowercase on upsert (`lib/newsletter/subscribers.ts:35`).
- Verified emails short-circuit without token refresh (`lib/newsletter/subscribers.ts:44-46`).
- Confirmation email includes RFC 8058 `List-Unsubscribe` headers (`lib/newsletter/subscribers.ts:123-126`).
- CRM sync failures are logged but do not block verify response; verify route enqueues retry (`app/api/newsletter/verify/route.ts:28-38`).

## Connections

- **depends_on:** [[entities/data-models/newsletter-subscribers-table]], Resend, CRM RPC, automation enrollments
- **used_by:** public subscribe/verify/unsubscribe routes, admin subscribers POST
- **related concepts:** [[concepts/newsletter-double-opt-in-flow]]

## Tested by

- `lib/newsletter/__tests__/subscribers.test.ts`

## Sources

- `lib/newsletter/subscribers.ts` (lines 1-262)
