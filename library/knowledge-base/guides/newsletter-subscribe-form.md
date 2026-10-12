# Newsletter Subscribe Form

> Category: How-to Guide | Version: 1.0 | Date: May 2026 | Status: Active

How operators collect newsletter opt-ins: public form URL, admin customization, embed options, and external API posting.

**Related:**
- [`../api/newsletter-api.md`](../api/newsletter-api.md) — subscribe/verify/unsubscribe endpoints
- [`../../requirements/features/feature-008-newsletter-subscriber-signup/`](../../requirements/features/feature-008-newsletter-subscriber-signup/)
- [`../wiki/concepts/newsletter-double-opt-in-flow.md`](../wiki/concepts/newsletter-double-opt-in-flow.md)

---

## Overview

Signups use **double opt-in**: the public form creates a pending row and sends a confirmation email; verification promotes the subscriber into CRM + automation.

There is no separate marketing-site embed widget. The form lives at:

```
https://__YOUR_DOMAIN__/newsletter/subscribe
```

---

## Admin: customize the form

1. Sign in to admin → **Settings** → **Subscribe Form** (`/admin/settings/subscribe-form`).
2. Edit heading, subtext, button label, success message, primary colour, and optional field toggles (name, business, industry).
3. Click **Save** — values persist in `newsletter_settings.branding` via `PATCH /api/newsletter/settings`.
4. Use the **Live preview** iframe to confirm changes (refreshes after save).

---

## Share or embed

From the same settings page:

| Method | Snippet |
|---|---|
| Direct link | `<a href="…/newsletter/subscribe">Subscribe</a>` |
| Popup window | `<button onclick="window.open('…/newsletter/subscribe', …)">Subscribe</button>` |

Copy the generated snippet from the **Embed & link** card.

---

## Manage subscribers

| Task | Where |
|---|---|
| List / search / filter | `/admin/subscribers` |
| Manual add | Subscribe Form settings → **Add subscriber manually** |
| API list/add | `GET/POST /api/admin/subscribers` (session auth) |

Manual add sends confirmation email by default. Pass `skip_confirmation: true` only when importing already-opted-in addresses (row stays pending until verified by other means).

---

## External site API posting

External marketing pages can POST directly:

```
POST /api/newsletter/subscribe
Content-Type: application/json
x-api-key: <NEWSLETTER_SIGNUP_SECRET>   # required when env var is set
```

Body (snake_case):

| Field | Required | Notes |
|---|---|---|
| `email` | yes | Valid email |
| `consent` | yes | Must be `true` |
| `first_name`, `last_name`, `business_name`, `industry` | no | Max lengths per schema |
| `source`, `referrer` | no | Attribution |

Response is always `{ success: true }` on valid requests to prevent email enumeration.

Rate limit: **5 requests/minute/IP**.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes | Confirmation email |
| `NEWSLETTER_FROM_EMAIL` | yes | From address |
| `NEXT_PUBLIC_SITE_URL` | yes | Verification/unsubscribe URLs |
| `UNSUBSCRIBE_SECRET` | yes (prod) | HMAC unsubscribe tokens |
| `NEWSLETTER_SIGNUP_SECRET` | no | Locks public subscribe API to callers with `x-api-key` |

Generate secrets: `openssl rand -base64 32`

---

## Verification flow (subscriber-facing)

1. Subscriber submits form → confirmation email with link to `/newsletter/verify?token=…`.
2. Verify page calls `GET /api/newsletter/verify` → CRM sync + automation enrolment.
3. Unsubscribe links in mail use signed URLs: `/newsletter/unsubscribe?id=…&token=…`.

Token expiry: **24 hours** (`lib/newsletter/verification-token.ts`).

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Form saves but preview unchanged | Hard-refresh iframe; confirm settings PATCH succeeded |
| No confirmation email | `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, server logs |
| Verify link 410 | Token expired — re-submit subscribe form |
| External POST 401 | `NEWSLETTER_SIGNUP_SECRET` + matching `x-api-key` header |
| CSRF errors from browser | Use `/newsletter/subscribe` page or excluded API paths in `proxy.ts` |

---

## Changelog

- v1.0 (2026-05-28) — Initial guide for feature #008 subscriber signup restore.
