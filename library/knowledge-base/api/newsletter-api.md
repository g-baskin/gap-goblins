# Newsletter API

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

Edition CRUD, curation, AI generation, send/publish, queue jobs, subscriber stats, and public double opt-in signup.

**Related:**
- [`architecture/newsletter-pipeline.md`](../architecture/newsletter-pipeline.md)
- [`architecture/queue-and-worker.md`](../architecture/queue-and-worker.md)

---

## Authentication

| Route class | Auth |
|---|---|
| Admin UI operations | NextAuth session |
| Public subscribe / verify / unsubscribe | None (token or optional `x-api-key`) |
| Automation / worker triggers | `NEWSLETTER_API_KEY` (Bearer) where enforced |

---

## Editions

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/newsletter` | List/create editions |
| GET, PATCH, DELETE | `/api/newsletter/[id]` | Single edition |
| GET | `/api/newsletter/[id]/preview` | HTML preview |
| POST | `/api/newsletter/[id]/send` | Trigger send for edition |

Tests: `app/api/newsletter/__tests__/route.test.ts`

---

## Pipeline actions

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/newsletter/curate` | Fetch/score articles from sources |
| POST | `/api/newsletter/generate` | AI-generate edition content |
| POST | `/api/newsletter/send` | Publish/send workflow |
| POST | `/api/newsletter/send-test` | Send test email to admin |

Generation tests: `app/__tests__/api/newsletter/generate.test.ts`

---

## Public subscriber lifecycle

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/newsletter/subscribe` | Create pending subscriber + send confirmation email |
| GET | `/api/newsletter/verify?token=` | Verify email, sync CRM, enrol automation |
| GET, POST | `/api/newsletter/unsubscribe?id=&token=` | RFC 8058 one-click unsubscribe |

**Subscribe body** (`newsletterSubscribeSchema`): `email`, `consent: true` (required), optional `first_name`, `last_name`, `business_name`, `industry`, `source`, `referrer`.

**Optional API key:** When `NEWSLETTER_SIGNUP_SECRET` is set, callers must send `x-api-key` matching that value.

**Rate limit:** 5 requests/minute/IP on subscribe.

**Anti-enumeration:** Subscribe always returns `{ success: true }` for valid requests; already-verified emails do not re-send mail.

Tests: `app/api/newsletter/subscribe/__tests__/route.test.ts`, `app/api/newsletter/unsubscribe/__tests__/route.test.ts`, `lib/newsletter/__tests__/subscribers.test.ts`

Public pages: `/newsletter/subscribe`, `/newsletter/verify`, `/newsletter/unsubscribe`

Guide: [`guides/newsletter-subscribe-form.md`](../guides/newsletter-subscribe-form.md)

---

## Admin subscribers

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/subscribers` | Paginated list (search, filter: all/verified/unsubscribed) |
| POST | `/api/admin/subscribers` | Manual add; optional `skip_confirmation` |

Auth: NextAuth session, role `admin` or `super_admin`.

Admin UI: `/admin/subscribers`, `/admin/settings/subscribe-form`

---

## Settings & stats

| Method | Path | Purpose |
|---|---|---|
| GET, PATCH | `/api/newsletter/settings` | Global newsletter config |
| GET | `/api/newsletter/stats` | Delivery/open metrics |
| GET | `/api/newsletter/queue/stats` | Send queue depth |

Tests: `app/api/newsletter/stats/__tests__/route.test.ts`

---

## Jobs

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/newsletter/jobs/[id]` | Job status poll |
| GET | `/api/newsletter/health` | Subsystem health |

Background equivalents: pg-boss queues `newsletter-send`, `newsletter-curate`, `newsletter-publish`, `newsletter-cleanup`.

---

## Cron integration

Scheduled sends may be triggered via `GET /api/cron/newsletter-schedule` — see [`webhooks-and-cron.md`](webhooks-and-cron.md).

---

## Related docs

- [`requirements/features/feature-004-newsletter-engine/`](../../requirements/features/feature-004-newsletter-engine/)
- [`requirements/features/feature-008-newsletter-subscriber-signup/`](../../requirements/features/feature-008-newsletter-subscriber-signup/)

---

## Changelog

- v1.1 (2026-05-28) — Public subscribe/verify/unsubscribe + admin subscriber routes (feature #008).
- v1.0 (2026-05) — Initial newsletter API reference.
