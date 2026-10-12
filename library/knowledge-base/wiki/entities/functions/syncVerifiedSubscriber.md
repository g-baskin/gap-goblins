---
type: entity
title: syncVerifiedSubscriber
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/newsletter/subscribers.ts
language: ts
depends_on:
  - "[[entities/data-models/contacts-table]]"
  - "[[entities/data-models/newsletter-subscribers-table]]"
used_by:
  - "[[entities/endpoints/get-api-newsletter-verify]]"
  - "[[entities/modules/crm-retry-queue]]"
last_commit_hash: uncommitted-2026-05-28
tested_by:
  - lib/newsletter/__tests__/subscribers.test.ts
tags:
  - entity
  - function
  - newsletter
  - crm
related:
  - "[[concepts/crm-status-hierarchy]]"
  - "[[concepts/newsletter-double-opt-in-flow]]"
sources:
  - lib/newsletter/subscribers.ts
partial_scan: true
---

# syncVerifiedSubscriber

## Overview

Post-verification side effects: CRM contact upsert at `subscriber` status, `isNewsletterSubscriber` flag, automation enrolment, admin notification (`lib/newsletter/subscribers.ts:165-226`).

## Signature / Definition

```ts
export async function syncVerifiedSubscriber(subscriber: SubscriberRow): Promise<void>
```

## Behavior

1. RPC `upsert_contact_with_hierarchy_protection` with `p_contact_status := subscriber` (`:176-189`).
2. Updates `contacts.isNewsletterSubscriber = true` (`:199-202`).
3. `enrollSubscriberInActiveFlows(subscriber.id)` (`:211-215`).
4. `notifyNewSubscriber(…)` (`:217-225`).

Each step wrapped in try/catch — failures logged, do not throw to caller.

## Connections

- **related concepts:** [[concepts/crm-status-hierarchy]]
- **used_by:** verify route; crm-retry-queue `newsletter_subscriber_sync` case

## Tested by

- `lib/newsletter/__tests__/subscribers.test.ts`

## Sources

- `lib/newsletter/subscribers.ts` (lines 165-226)
