# Webhooks and Cron

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

External webhooks (Cal.com, Resend) and internal cron endpoints gated by shared secrets.

**Related:**
- [`architecture/auth-and-security.md`](../architecture/auth-and-security.md)
- [`guides/locked-business-rules.md`](../guides/locked-business-rules.md)

---

## Proxy matcher exclusions

These paths **bypass** `proxy.ts` (no CSRF/session) — they implement their own verification:

- `/api/webhooks/*`
- `/api/outreach/webhooks/*`
- `/api/outreach/import/*` (partial)

Configured in Next.js proxy config at repo root.

---

## Cal.com webhook

| Method | Path | Auth |
|---|---|---|
| POST | `/api/webhooks/cal` | HMAC-SHA256 (`CAL_WEBHOOK_SECRET`) |

**Production URL (locked):** `https://hooks.__YOUR_DOMAIN__/api/webhooks/cal`

Events handled: primarily `BOOKING_CREATED` — calls RPC `update_contact_and_deal_for_booking`.

Docs: `app/api/webhooks/cal/README.md`  
Tests: `app/api/webhooks/cal/__tests__/route.test.ts`

---

## Resend webhook (outreach)

| Method | Path | Auth |
|---|---|---|
| POST | `/api/outreach/webhooks/resend` | Svix headers (`RESEND_WEBHOOK_SECRET`) |

Events: `email.received`, delivery, bounce, open, click → `lib/outreach/webhooks/events/*`

Tests: `lib/outreach/webhooks/__tests__/resend-handler.test.ts`, `lib/outreach/webhooks/events/__tests__/received.test.ts`

---

## Cron routes

All expect `Authorization: Bearer <secret>` unless route file specifies alternate header.

| Method | Path | Secret env | Purpose |
|---|---|---|---|
| GET | `/api/cron/process-crm-queue` | `CRON_SECRET` | Process `crm_sync_queue` retries |
| GET | `/api/cron/newsletter-schedule` | `CRON_SECRET` | Trigger scheduled newsletter jobs |

Outreach batch processing uses **pg-boss cron** inside worker (`outreach-process` every 5 min) rather than HTTP — may also be triggered via `/api/outreach/process` with `OUTREACH_CRON_SECRET`.

---

## Secret generation

```bash
openssl rand -hex 32   # webhook/cron/API keys
openssl rand -base64 32   # AUTH_SECRET
```

Store in Railway env vars — never commit to git.

---

## Health check

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | Public |

Tests: `app/api/health/__tests__/route.test.ts`

---

## Related docs

- [`architecture/deployment.md`](../architecture/deployment.md)
- [`architecture/cloudflare-integration.md`](../architecture/cloudflare-integration.md)

---

## Changelog

- v1.0 (2026-05) — Initial webhooks/cron reference.
