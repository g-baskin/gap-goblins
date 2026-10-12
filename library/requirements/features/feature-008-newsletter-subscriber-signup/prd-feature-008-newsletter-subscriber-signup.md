# Feature #008: Newsletter Subscriber Signup & Form Hub (Retroactive)

> **template-crm / admin-platform** — Feature PRD #008
>
> **Status:** Shipped (documented retroactively 2026-05-28; working tree uncommitted)
> **Priority:** P1
> **Schema changes:** None (uses existing `newsletter_subscribers`, `newsletter_settings.branding` JSONB)
> **Related:** [`feature-004-newsletter-engine`](../feature-004-newsletter-engine/prd-feature-004-newsletter-engine.md)

---

## Phase Overview

### Problem statement

The newsletter engine (feature #004) could send editions to `newsletter_subscribers`, but the public signup front door, double opt-in verification, unsubscribe handling, admin subscriber management, and configurable subscribe form had been removed with the marketing site. Operators had no way to collect opt-ins or customize the form without code changes.

### Goals (as shipped)

- Public double opt-in signup at `/newsletter/subscribe` with consent capture.
- Token-based email verification and HMAC-signed unsubscribe (RFC 8058 headers on confirmation email).
- CRM sync on verification (`upsert_contact_with_hierarchy_protection` + automation enrolment + admin notification).
- Admin subscriber list, manual add, and subscribe-form settings (copy, field toggles, colour, embed snippets, live preview).
- Optional `x-api-key` gate for external sites posting to the subscribe API.

### Scope

| Surface | Path |
|---|---|
| Public subscribe page | `/newsletter/subscribe` |
| Public verify page | `/newsletter/verify?token=…` |
| Public unsubscribe page | `/newsletter/unsubscribe?id=…&token=…` |
| Subscribe API | `POST /api/newsletter/subscribe` |
| Verify API | `GET /api/newsletter/verify?token=…` |
| Unsubscribe API | `GET\|POST /api/newsletter/unsubscribe?id=…&token=…` |
| Admin subscribers | `/admin/subscribers` |
| Subscribe form settings | `/admin/settings/subscribe-form` |
| Admin manual add | `POST /api/admin/subscribers` |
| Domain module | `lib/newsletter/subscribers.ts` |

### Out of scope

- Newsletter edition curation/generation/send (feature #004).
- Embeddable iframe widget SDK (operators use direct link or popup snippet from settings).
- Marketing-site SEO for subscribe page (`robots: { index: false }` on subscribe page).

### Dependencies

| Dependency | Evidence |
|---|---|
| `newsletter_subscribers` table | `lib/db/schema.ts` — `newsletterSubscribers` |
| `newsletter_settings.branding` JSONB | `GET/PATCH /api/newsletter/settings` |
| Resend | `sendConfirmationEmail` in `lib/newsletter/subscribers.ts` |
| CRM RPC | `upsert_contact_with_hierarchy_protection` in `syncVerifiedSubscriber` |
| Automation | `enrollSubscriberInActiveFlows` on verify |
| Retry queue | `enqueueCrmOperation("newsletter_subscriber_sync", …)` fallback in verify route |
| Env: `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL` | `.env.example` |
| Env: `UNSUBSCRIBE_SECRET` (required for signed unsubscribe) | `lib/newsletter/unsubscribe-token.ts` |
| Env: `NEWSLETTER_SIGNUP_SECRET` (optional API key) | `app/api/newsletter/subscribe/route.ts` |

---

## User Stories

### US-8.1 — Public signup (double opt-in)

**As a** site visitor, **I can** submit the subscribe form with consent, **so that** I receive a confirmation email.

**Acceptance criteria:**

- AC-8.1.1 Given valid JSON with `consent: true`, when `POST /api/newsletter/subscribe`, then `{ success: true }` and a pending row is upserted with consent IP/UA metadata.
- AC-8.1.2 Given the email is already verified, when POST succeeds, then no confirmation email is re-sent (anti-enumeration).
- AC-8.1.3 Given invalid body or `consent !== true`, when POST, then `400` with validation message.
- AC-8.1.4 Given more than 5 requests/minute/IP, when POST, then `429`.
- AC-8.1.5 Given `NEWSLETTER_SIGNUP_SECRET` is set and `x-api-key` is wrong/missing, when POST, then `401`.

### US-8.2 — Email verification

**As a** pending subscriber, **I can** click the confirmation link, **so that** my subscription is verified and I enter the CRM/automation flows.

**Acceptance criteria:**

- AC-8.2.1 Given a valid non-expired token, when `GET /api/newsletter/verify?token=…`, then `{ status: "verified" }` and row marked verified.
- AC-8.2.2 Given expired/invalid token, when GET, then `{ status: "expired" }` with `410` or `{ status: "invalid" }` with `400`.
- AC-8.2.3 On verify, CRM contact upsert runs inline; on failure, `newsletter_subscriber_sync` is enqueued.

### US-8.3 — Unsubscribe

**As a** subscriber, **I can** unsubscribe via signed link, **so that** I stop receiving mail and automation enrollments stop.

**Acceptance criteria:**

- AC-8.3.1 Given valid `id` + HMAC token, when GET or POST unsubscribe, then `{ success: true }`.
- AC-8.3.2 Given invalid token, when unsubscribe, then `403`.
- AC-8.3.3 On success, active automation enrollments for subscriber are stopped.

### US-8.4 — Admin subscribe form hub

**As an** admin, **I can** customize form copy/fields/colour, preview the live form, copy embed snippets, and manually add subscribers.

**Acceptance criteria:**

- AC-8.4.1 Settings persist in `newsletter_settings.branding` via existing settings API.
- AC-8.4.2 `/newsletter/subscribe` Server Component fetches branding and passes props to `SubscribeForm`.
- AC-8.4.3 Manual add via `POST /api/admin/subscribers` with optional `skip_confirmation`.

---

## Data Model (as shipped)

Uses existing `newsletter_subscribers` — no migration in this feature.

| Field | Role in signup flow |
|---|---|
| `email` | Unique lookup key (normalized lowercase) |
| `verification_token` / `verification_token_expires_at` | Double opt-in (24h expiry) |
| `verified` / `verified_at` | Set on token verify |
| `consent_given_at` / `consent_ip_address` / `consent_user_agent` | GDPR-style consent capture |
| `source` / `referrer` | Attribution (`website`, `admin_manual`, etc.) |
| `unsubscribed` / `unsubscribed_at` | Unsubscribe state |

Form branding stored in `newsletter_settings.branding` JSONB keys: `formHeading`, `formSubtext`, `formButtonText`, `formSuccessText`, `formShowName`, `formShowBusiness`, `formShowIndustry`, `primaryColor`.

---

## API Specs (as shipped)

### POST `/api/newsletter/subscribe`

- **Auth:** Public; optional `x-api-key` when `NEWSLETTER_SIGNUP_SECRET` set.
- **Rate limit:** 5/min/IP.
- **Body schema:** `newsletterSubscribeSchema` in `lib/validations/newsletter.ts`.
- **Response:** Always `{ success: true }` on happy path (no email enumeration).
- **CSRF:** Excluded in `proxy.ts` matcher.

### GET `/api/newsletter/verify`

- **Auth:** Public (token in query).
- **Responses:** `{ status: "verified" \| "expired" \| "invalid" \| "error" }`.

### GET|POST `/api/newsletter/unsubscribe`

- **Auth:** HMAC-signed token (`UNSUBSCRIBE_SECRET` or `AUTH_SECRET` fallback).
- **Responses:** `{ success: true }` or error JSON with 400/403/404/500.

### POST `/api/admin/subscribers`

- **Auth:** NextAuth session, role `admin` or `super_admin`.
- **Body:** `addSubscriberSchema` — email required; `skip_confirmation` optional.

---

## Files Touched (as shipped)

| File | Status |
|---|---|
| `lib/newsletter/subscribers.ts` | Created — domain logic |
| `lib/newsletter/verification-token.ts` | Created |
| `lib/newsletter/unsubscribe-token.ts` | Created |
| `lib/validations/newsletter.ts` | Modified — `newsletterSubscribeSchema` |
| `app/api/newsletter/subscribe/route.ts` | Created |
| `app/api/newsletter/verify/route.ts` | Created |
| `app/api/newsletter/unsubscribe/route.ts` | Created |
| `app/newsletter/subscribe/page.tsx` | Created (Server Component) |
| `app/newsletter/verify/page.tsx` | Created |
| `app/newsletter/unsubscribe/page.tsx` | Created |
| `components/newsletter/SubscribeForm.tsx` | Created |
| `app/admin/(dashboard)/subscribers/page.tsx` | Created |
| `app/admin/(dashboard)/settings/subscribe-form/page.tsx` | Created |
| `app/api/admin/subscribers/route.ts` | Created (GET + POST) |
| `lib/crm-retry-queue.ts` | Modified — delegates to `syncVerifiedSubscriber` |
| `lib/newsletter/emails/confirmation-email.tsx` | Modified — signed unsubscribe URL |
| `proxy.ts` | Modified — CSRF exclusions for public newsletter routes |
| `.env.example` | Modified — `NEWSLETTER_SIGNUP_SECRET`, `UNSUBSCRIBE_SECRET` docs |
| `components/shadcn/app-sidebar.tsx` | Modified — Subscribers nav |
| `components/settings/settings-sidebar.tsx` | Modified — Subscribe Form nav |

---

## Test Plan (existing)

| Test file | Coverage |
|---|---|
| `lib/newsletter/__tests__/subscribers.test.ts` | Domain functions |
| `lib/newsletter/__tests__/unsubscribe-token.test.ts` | HMAC verify |
| `app/api/newsletter/subscribe/__tests__/route.test.ts` | Subscribe route |
| `app/api/newsletter/unsubscribe/__tests__/route.test.ts` | Unsubscribe route |

---

## Risks and Open Questions

- Signup code is **uncommitted** in git as of 2026-05-28 — deploy requires commit + push.
- `skip_confirmation: true` on admin POST does not auto-verify; it only skips sending email — operator must understand pending vs verified states.
- Subscribe page uses inline styles (not design tokens) — intentional for embed-friendly standalone page.
- `GET /api/newsletter/settings` on subscribe page uses server-side fetch to own origin — requires `NEXT_PUBLIC_SITE_URL` correct in production.

---

## Related docs

- [`library/knowledge-base/guides/newsletter-subscribe-form.md`](../../../knowledge-base/guides/newsletter-subscribe-form.md)
- [`library/knowledge-base/api/newsletter-api.md`](../../../knowledge-base/api/newsletter-api.md)
- [`library/knowledge-base/wiki/concepts/newsletter-double-opt-in-flow.md`](../../../knowledge-base/wiki/concepts/newsletter-double-opt-in-flow.md)
