# API Routes Overview

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

Index of major HTTP route handlers under `app/api/` grouped by product area (admin, CRM, outreach, newsletter, webhooks, automation, cron).

**Related:**
- [`api-overview.md`](api-overview.md) — auth modes, response conventions, CSRF
- [`admin-api.md`](admin-api.md), [`crm-api.md`](crm-api.md), [`outreach-api.md`](outreach-api.md), [`newsletter-api.md`](newsletter-api.md), [`webhooks-and-cron.md`](webhooks-and-cron.md)
- [`app/api/`](../../../app/api/)

---

## Overview

All routes are Next.js App Router **Route Handlers** (`route.ts` per segment). The admin UI calls most `/api/admin/*`, `/api/crm/*`, `/api/outreach/*`, and `/api/newsletter/*` routes with a **NextAuth session cookie**. Webhooks and cron use **secrets or signatures** instead.

For conventions (camelCase in Drizzle, CSRF on browser mutations), see [`api-overview.md`](api-overview.md).

---

## Route map by area

### Auth

| Method / path | File | Auth |
|---|---|---|
| `*` `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | Public (login/session) |

Handlers exported from `lib/auth.ts` (`handlers`, `signIn`, `signOut`, `auth`).

---

### Admin (settings, users, security, uploads, Cloudflare)

| Path prefix | File(s) | Notes |
|---|---|---|
| `/api/admin/dashboard` | `app/api/admin/dashboard/route.ts` | Dashboard aggregates |
| `/api/admin/users` | `app/api/admin/users/route.ts` | User management |
| `/api/admin/settings` | `app/api/admin/settings/route.ts` | Per-user settings |
| `/api/admin/site-settings` | `app/api/admin/site-settings/route.ts` | Site/branding |
| `/api/admin/invitations` | `app/api/admin/invitations/route.ts` | List/create invites (`super_admin`) |
| `/api/admin/invitations/accept` | `app/api/admin/invitations/accept/route.ts` | Accept invite (public + token) |
| `/api/admin/security/password` | `app/api/admin/security/password/route.ts` | Change password |
| `/api/admin/security/reset-password` | `app/api/admin/security/reset-password/route.ts` | Reset flow; sets `passwordChangedAt` |
| `/api/admin/security/totp` | `app/api/admin/security/totp/route.ts` | TOTP enroll/verify |
| `/api/admin/security/sessions` | `app/api/admin/security/sessions/route.ts` | Revoke sessions via `passwordChangedAt` |
| `/api/admin/upload/avatar` | `app/api/admin/upload/avatar/route.ts` | S3 avatar upload + DELETE |
| `/api/admin/upload/logo` | `app/api/admin/upload/logo/route.ts` | S3 logo upload + DELETE |
| `/api/admin/branding/import-from-website` | `app/api/admin/branding/import-from-website/route.ts` | Brand import |
| `/api/admin/subscribers` | `app/api/admin/subscribers/route.ts` | Newsletter subscriber admin |
| `/api/admin/cloudflare/*` | `app/api/admin/cloudflare/**/route.ts` | DNS, redirects, email routing |

---

### CRM

| Path | File |
|---|---|
| `/api/crm/contacts` | `app/api/crm/contacts/route.ts` |
| `/api/crm/contacts/[id]` | `app/api/crm/contacts/[id]/route.ts` |
| `/api/crm/contacts/bulk-update` | `app/api/crm/contacts/bulk-update/route.ts` |
| `/api/crm/contacts/bulk-delete` | `app/api/crm/contacts/bulk-delete/route.ts` |
| `/api/crm/deals` | `app/api/crm/deals/route.ts` |
| `/api/crm/deals/[id]` | `app/api/crm/deals/[id]/route.ts` |
| `/api/crm/deals/[id]/move` | `app/api/crm/deals/[id]/move/route.ts` |
| `/api/crm/deals/bulk-update` | `app/api/crm/deals/bulk-update/route.ts` |
| `/api/crm/deals/bulk-delete` | `app/api/crm/deals/bulk-delete/route.ts` |
| `/api/crm/pipeline-deals` | `app/api/crm/pipeline-deals/route.ts` |
| `/api/crm/metrics` | `app/api/crm/metrics/route.ts` |
| `/api/crm/activity` | `app/api/crm/activity/route.ts` |

Heavy lifting uses PostgreSQL RPCs via `db.execute(sql\`...\`)` — see `CLAUDE.md` and `lib/db/schema.ts`.

---

### Outreach

| Path | File |
|---|---|
| `/api/outreach/campaigns` | `app/api/outreach/campaigns/route.ts` |
| `/api/outreach/campaigns/[campaignId]` | `app/api/outreach/campaigns/[campaignId]/route.ts` |
| `/api/outreach/campaigns/tags` | `app/api/outreach/campaigns/tags/route.ts` |
| `/api/outreach/campaigns/.../schedules` | `app/api/outreach/campaigns/[campaignId]/schedules/route.ts` |
| `/api/outreach/campaigns/.../sender-accounts` | `app/api/outreach/campaigns/[campaignId]/sender-accounts/route.ts` |
| `/api/outreach/contacts/[contactId]` | `app/api/outreach/contacts/[contactId]/route.ts` |
| `/api/outreach/contacts/bulk/activate` | `app/api/outreach/contacts/bulk/activate/route.ts` |
| `/api/outreach/import/[campaignId]` | `app/api/outreach/import/[campaignId]/route.ts` |
| `/api/outreach/replies` | `app/api/outreach/replies/route.ts` |
| `/api/outreach/replies/[replyId]` | `app/api/outreach/replies/[replyId]/route.ts` |
| `/api/outreach/replies/[replyId]/send` | `app/api/outreach/replies/[replyId]/send/route.ts` |
| `/api/outreach/replies/stream` | `app/api/outreach/replies/stream/route.ts` |
| `/api/outreach/threads/[contactId]` | `app/api/outreach/threads/[contactId]/route.ts` |
| `/api/outreach/sender-accounts` | `app/api/outreach/sender-accounts/route.ts` |
| `/api/outreach/send-email` | `app/api/outreach/send-email/route.ts` |
| `/api/outreach/process` | `app/api/outreach/process/route.ts` |
| `/api/outreach/webhooks/resend` | `app/api/outreach/webhooks/resend/route.ts` |
| `/api/outreach/blocklist` | `app/api/outreach/blocklist/route.ts` |
| `/api/outreach/unsubscribe/[contactId]` | `app/api/outreach/unsubscribe/[contactId]/route.ts` |
| `/api/outreach/health` | `app/api/outreach/health/route.ts` |

Enqueue path: routes call `lib/queue/index.ts` → worker runs `lib/outreach/sending/sender.ts`.

---

### Newsletter

| Path | File |
|---|---|
| `/api/newsletter` | `app/api/newsletter/route.ts` |
| `/api/newsletter/[id]` | `app/api/newsletter/[id]/route.ts` |
| `/api/newsletter/generate` | `app/api/newsletter/generate/route.ts` |
| `/api/newsletter/curate` | `app/api/newsletter/curate/route.ts` |
| `/api/newsletter/send` | `app/api/newsletter/send/route.ts` |
| `/api/newsletter/subscribe` | `app/api/newsletter/subscribe/route.ts` |
| `/api/newsletter/verify` | `app/api/newsletter/verify/route.ts` |
| `/api/newsletter/unsubscribe` | `app/api/newsletter/unsubscribe/route.ts` |
| `/api/newsletter/settings` | `app/api/newsletter/settings/route.ts` |
| `/api/newsletter/queue/stats` | `app/api/newsletter/queue/stats/route.ts` |
| `/api/newsletter/jobs/[id]` | `app/api/newsletter/jobs/[id]/route.ts` |

---

### Webhooks (unauthenticated; verified by secret)

| Path | File |
|---|---|
| `/api/webhooks/cal` | `app/api/webhooks/cal/route.ts` |
| `/api/outreach/webhooks/resend` | `app/api/outreach/webhooks/resend/route.ts` |

**Cal.com production URL (locked):** `https://hooks.__YOUR_DOMAIN__/api/webhooks/cal` — grey-cloud `hooks` CNAME only. See `app/api/webhooks/cal/README.md`.

---

### Automation

| Path | File |
|---|---|
| `/api/automation/flows` | `app/api/automation/flows/route.ts` |
| `/api/automation/flows/[flowId]/*` | `app/api/automation/flows/[flowId]/route.ts` (+ activate, pause, enroll, steps) |
| `/api/automation/stats` | `app/api/automation/stats/route.ts` |
| `/api/automation/unsubscribe/[enrollmentId]` | `app/api/automation/unsubscribe/[enrollmentId]/route.ts` |

Worker queue: `automation-send-step` (`lib/queue/index.ts`, `scripts/worker.ts`).

---

### Cron

| Path | File |
|---|---|
| `/api/cron/newsletter-schedule` | `app/api/cron/newsletter-schedule/route.ts` |
| `/api/cron/process-crm-queue` | `app/api/cron/process-crm-queue/route.ts` |

Gated by `CRON_SECRET` / `OUTREACH_CRON_SECRET` (see `api-overview.md`).

---

### Media and health

| Path | File |
|---|---|
| `/api/media/avatars/[filename]` | `app/api/media/avatars/[filename]/route.ts` |
| `/api/media/logos/[filename]` | `app/api/media/logos/[filename]/route.ts` |
| `/api/health` | `app/api/health/route.ts` |
| `/api/notifications/*` | `app/api/notifications/route.ts` |

---

## Related code

- `app/api/` — all route handlers
- `proxy.ts` — session protection, CSRF, webhook host guard
- `lib/queue/index.ts` — enqueue from API routes

---

## Related docs

- [`../architecture/system-overview.md`](../architecture/system-overview.md)
- [`../outreach/pipeline-and-reply-flow.md`](../outreach/pipeline-and-reply-flow.md)
- [`../auth/admin-auth.md`](../auth/admin-auth.md)

---

## Changelog

- v1.0 (2026-05) — Initial route index by product area.

---

## Machine-readable route catalog

Every API route handler in this application has a corresponding wiki entity page in [`library/knowledge-base/wiki/entities/endpoints/`](../wiki/entities/endpoints/). These pages document HTTP methods, auth requirements, dependencies, and key behaviours. The canonical source for route-level machine-readable metadata is that directory — not this narrative document.

As of 2026-05-28, the wiki covers all 92 `app/api/**/route.ts` files.
