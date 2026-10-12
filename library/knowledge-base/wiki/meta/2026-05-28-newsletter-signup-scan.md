---
type: meta
title: "2026-05-28 Newsletter Signup Scan"
report_type: scan
date: 2026-05-28
contradiction_count: 0
tags:
  - meta
  - newsletter
  - signup
partial_scan: true
---

# 2026-05-28 Newsletter Signup Scan

## Summary

Partial scan for feature #008 (newsletter subscriber signup restore). **14 new wiki pages** (12 entity + 1 concept + 1 data-model). No prior pages for this surface — **zero contradictions**.

Signup implementation files are **uncommitted** in git as of this scan.

## Scope

- `lib/newsletter/subscribers.ts`
- `lib/newsletter/verification-token.ts`
- `lib/newsletter/unsubscribe-token.ts`
- `app/api/newsletter/subscribe/route.ts`
- `app/api/newsletter/verify/route.ts`
- `app/api/newsletter/unsubscribe/route.ts`
- `app/api/admin/subscribers/route.ts`
- `app/newsletter/subscribe/page.tsx`
- `app/newsletter/verify/page.tsx`
- `app/newsletter/unsubscribe/page.tsx`
- `components/newsletter/SubscribeForm.tsx`
- `app/admin/(dashboard)/settings/subscribe-form/page.tsx`
- `app/admin/(dashboard)/subscribers/page.tsx` (referenced, not fully extracted)

## Pages Created

| Page | Type |
|---|---|
| `concepts/newsletter-double-opt-in-flow.md` | concept |
| `entities/modules/newsletter-subscribers.md` | module |
| `entities/modules/newsletter-verification-token.md` | module |
| `entities/modules/newsletter-unsubscribe-token.md` | module |
| `entities/functions/syncVerifiedSubscriber.md` | function |
| `entities/endpoints/post-api-newsletter-subscribe.md` | endpoint |
| `entities/endpoints/get-api-newsletter-verify.md` | endpoint |
| `entities/endpoints/get-post-api-newsletter-unsubscribe.md` | endpoint |
| `entities/endpoints/post-api-admin-subscribers.md` | endpoint |
| `entities/components/SubscribeForm.md` | react-component |
| `entities/pages/newsletter-subscribe-page.md` | page |
| `entities/pages/subscribe-form-settings-page.md` | page |
| `entities/env-vars/NEWSLETTER_SIGNUP_SECRET.md` | env-var |
| `entities/env-vars/UNSUBSCRIBE_SECRET.md` | env-var |
| `entities/data-models/newsletter-subscribers-table.md` | data-model |

## Library docs created/updated

| Doc | Action |
|---|---|
| `requirements/features/feature-008-newsletter-subscriber-signup/` | Created backwards-PRD |
| `knowledge-base/guides/newsletter-subscribe-form.md` | Created how-to |
| `knowledge-base/api/newsletter-api.md` | v1.1 — public lifecycle + admin routes |
| `knowledge-base/guides/locked-business-rules.md` | §5 anti-enumeration rule |
| `requirements/features/feature-004-newsletter-engine/` | Round 3 cross-ref |
| `library/README.md` | Start-here link |

## Contradictions

None.

## Gaps

- Admin subscribers list page (`/admin/subscribers`) — table UI not entity-extracted.
- Verify/unsubscribe public pages — thin wrappers; logic documented via API entities.
- `newsletterSubscribeSchema` — extend existing `entities/modules/newsletter-validations.md` on next pass.

## Notes

`partial_scan: true` — TS driver should reconcile `index.md`, `_index.md`, `log.md`, `hot.md`.
