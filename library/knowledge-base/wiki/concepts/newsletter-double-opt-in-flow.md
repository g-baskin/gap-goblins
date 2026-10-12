---
type: concept
title: Newsletter Double Opt-In Flow
complexity: intermediate
domain: newsletter
aliases:
  - subscriber signup
  - newsletter verification
created: "2026-05-28"
updated: "2026-05-28"
status: mature
tags:
  - concept
  - newsletter
related:
  - "[[entities/modules/newsletter-subscribers]]"
  - "[[entities/endpoints/post-api-newsletter-subscribe]]"
  - "[[entities/endpoints/get-api-newsletter-verify]]"
  - "[[concepts/crm-status-hierarchy]]"
sources:
  - lib/newsletter/subscribers.ts
partial_scan: true
---

# Newsletter Double Opt-In Flow

## Definition

The path from public form submission to verified `newsletter_subscribers` row, CRM contact sync at `subscriber` status, and automation enrolment. Uses a 24-hour verification token and HMAC-signed unsubscribe URLs on confirmation mail.

## How it works

1. **Subscribe** — `POST /api/newsletter/subscribe` validates `newsletterSubscribeSchema`, rate-limits by IP, upserts pending row via `createOrRefreshPendingSubscriber`, sends confirmation via `sendConfirmationEmail` (`lib/newsletter/subscribers.ts:32-96`, `:101-128`).
2. **Confirm** — Subscriber clicks link → `/newsletter/verify?token=` → `GET /api/newsletter/verify` calls `verifySubscriberByToken` then `syncVerifiedSubscriber` (`app/api/newsletter/verify/route.ts:14-40`).
3. **CRM sync** — `syncVerifiedSubscriber` runs `upsert_contact_with_hierarchy_protection` with `p_contact_status := subscriber`, sets `contacts.isNewsletterSubscriber`, enrols automation, notifies admin (`lib/newsletter/subscribers.ts:165-226`).
4. **Unsubscribe** — Signed `id`+`token` URL → `unsubscribeSubscriber` marks unsubscribed and stops active enrollments (`lib/newsletter/unsubscribe-token.ts`, `lib/newsletter/subscribers.ts:231-262`).

## Why it matters

Without verification, unconfirmed addresses enter the send queue. Without CRM sync, subscribers are invisible to outreach pipeline rules. Anti-enumeration on subscribe prevents email probing.

## Examples in this codebase

- [[entities/components/SubscribeForm]] — client form posting to subscribe API
- [[entities/modules/newsletter-subscribers]] — shared domain functions
- [[entities/pages/subscribe-form-settings-page]] — admin branding + manual add

## Connections

- **involves entities:** [[entities/endpoints/post-api-newsletter-subscribe]], [[entities/functions/syncVerifiedSubscriber]]
- **related concepts:** [[concepts/crm-status-hierarchy]], [[concepts/resend-webhook-event-flow]]

## Sources

- `lib/newsletter/subscribers.ts` (lines 32-262) — primary lifecycle
- `app/api/newsletter/subscribe/route.ts` (lines 23-100) — public entry
- `app/api/newsletter/verify/route.ts` (lines 14-44) — verification + CRM
