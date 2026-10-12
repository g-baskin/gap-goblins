---
type: entity
title: POST /api/newsletter/subscribe
entity_type: endpoint
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/subscribe/route.ts
language: ts
depends_on:
  - "[[entities/modules/newsletter-subscribers]]"
used_by:
  - "[[entities/components/SubscribeForm]]"
last_commit_hash: uncommitted-2026-05-28
tested_by:
  - app/api/newsletter/subscribe/__tests__/route.test.ts
tags:
  - entity
  - endpoint
  - newsletter
related:
  - "[[concepts/newsletter-double-opt-in-flow]]"
sources:
  - app/api/newsletter/subscribe/route.ts
partial_scan: true
---

# POST /api/newsletter/subscribe

## Overview

Public endpoint creating pending subscribers and sending double opt-in mail. Optional `x-api-key` when `NEWSLETTER_SIGNUP_SECRET` is set (`app/api/newsletter/subscribe/route.ts:23-32`).

## Signature / Definition

```ts
export async function POST(request: NextRequest): Promise<Response>
```

## Behavior

| Step | Detail | Source |
|---|---|---|
| API key gate | 401 if secret set and key mismatch | `:26-32` |
| Rate limit | 5/min/IP key `newsletter-subscribe:{ip}` | `:34-51` |
| Validation | `newsletterSubscribeSchema` | `:61-67` |
| Upsert | `createOrRefreshPendingSubscriber` + consent metadata | `:72-82` |
| Response | `{ success: true }` always on success; no enumeration | `:84-96` |

Excluded from CSRF in `proxy.ts` matcher.

## Connections

- **depends_on:** [[entities/modules/newsletter-subscribers]], `newsletterSubscribeSchema`
- **used_by:** [[entities/components/SubscribeForm]]

## Tested by

- `app/api/newsletter/subscribe/__tests__/route.test.ts`

## Sources

- `app/api/newsletter/subscribe/route.ts` (lines 23-100)
