# Outreach API

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

Campaign management, contact import, reply inbox, sender accounts, webhooks, and automation endpoints.

**Related:**
- [`architecture/outreach-pipeline.md`](../architecture/outreach-pipeline.md)
- [`guides/locked-business-rules.md`](../guides/locked-business-rules.md)

---

## Authentication

| Route class | Auth |
|---|---|
| Admin CRUD (campaigns, replies, contacts) | NextAuth session |
| `/api/outreach/process`, `/api/outreach/send-email` | `OUTREACH_API_KEY` / cron patterns |
| `/api/outreach/webhooks/resend` | Resend/Svix signature |
| `/api/outreach/import/*` | Excluded from CSRF proxy; session or import token per route |
| `/api/outreach/unsubscribe/[contactId]` | Signed unsubscribe token |

---

## Campaigns

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/outreach/campaigns` | List/create campaigns |
| GET, PATCH, DELETE | `/api/outreach/campaigns/[campaignId]` | Single campaign |
| GET | `/api/outreach/campaigns/[campaignId]/performance` | Stats rollup |
| GET, POST | `/api/outreach/campaigns/[campaignId]/schedules` | Business hours schedules |
| PATCH, DELETE | `/api/outreach/campaigns/[campaignId]/schedules/[scheduleId]` | Schedule CRUD |
| GET, PUT | `/api/outreach/campaigns/[campaignId]/sender-accounts` | Campaign senders |
| GET | `/api/outreach/campaigns/tags` | Distinct tags (`get_unique_tags` RPC) |

Tests: `app/api/outreach/campaigns/[campaignId]/__tests__/route.test.ts`

---

## Contacts

| Method | Path | Purpose |
|---|---|---|
| GET, PATCH, DELETE | `/api/outreach/contacts/[contactId]` | Single outreach contact |
| POST | `/api/outreach/contacts/batch` | Batch operations |
| POST | `/api/outreach/contacts/bulk/activate` | Activate imported contacts |
| POST | `/api/outreach/import/[campaignId]` | CSV import |

Import tests: `lib/outreach/contacts/__tests__/import.test.ts`

---

## Replies & inbox

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/outreach/replies` | Inbox list (filters, pagination) |
| GET, PATCH | `/api/outreach/replies/[replyId]` | Single reply + AI fields |
| POST | `/api/outreach/replies/[replyId]/send` | Send admin reply (**locked Reply-To**) |
| GET | `/api/outreach/replies/stream` | SSE realtime stream |
| GET | `/api/outreach/threads/[contactId]` | Thread view |

Tests: `app/api/outreach/replies/__tests__/`, `app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts`

---

## Sender accounts

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/outreach/sender-accounts` | List/create senders |
| GET, PATCH, DELETE | `/api/outreach/sender-accounts/[id]` | Single sender |

---

## Automation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/outreach/send-email` | Enqueue single send (API key) |
| POST | `/api/outreach/process` | Trigger due-email batch |
| GET | `/api/outreach/health` | Outreach subsystem health |
| GET | `/api/outreach/test` | Dev/test helper |

Worker also runs `outreach-process` on cron — see [`architecture/queue-and-worker.md`](../architecture/queue-and-worker.md).

---

## Webhooks

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/outreach/webhooks/resend` | Inbound Resend events (received, delivered, etc.) |

Handler: `lib/outreach/webhooks/` — tests in `lib/outreach/webhooks/__tests__/`

---

## Unsubscribe

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/outreach/unsubscribe/[contactId]` | Public opt-out (signed) |

---

## Related docs

- [`requirements/features/feature-002-outreach-system/`](../../requirements/features/feature-002-outreach-system/)
- [`requirements/features/feature-003-inbox-and-ai-replies/`](../../requirements/features/feature-003-inbox-and-ai-replies/)

---

## Changelog

- v1.0 (2026-05) — Initial outreach API reference.
