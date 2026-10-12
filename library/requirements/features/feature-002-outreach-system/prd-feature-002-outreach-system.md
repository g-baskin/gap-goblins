# Feature #002: Outreach System (Retroactive)

> **template-crm / admin-platform** — Feature PRD #002
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P0
> **Schema changes:** `outreach_campaigns`, `outreach_contacts`, `outreach_schedules`, `outreach_sender_accounts`, `outreach_campaign_senders`, `outreach_blocklist`, `outreach_email_events`

---

## Phase Overview

### Problem statement

Sales teams need to run controlled cold-email campaigns (3-step sequences) with scheduling, domain throttling, deliverability safeguards, and accurate event tracking — without sacrificing reply deliverability via fake Reply-To addresses.

### Goals (as shipped)

- Campaign CRUD with email templates 1–3, tags, test mode, sender assignment.
- CSV contact import with validation.
- pg-boss powered sends (`outreach-send-email`) + 5-minute batch processor.
- Business-hours and per-domain rate limiting.
- Resend integration for send + webhook events.
- Unsubscribe flow with signed URLs.

### Scope

- Admin UI `/admin/outreach`
- API `/api/outreach/*` (except replies — see feature-003)
- Worker handlers in `scripts/worker.ts`
- Locked plain-mailbox Reply-To on all outbound sends

---

## User Flows (as shipped)

1. Admin creates campaign → assigns sender account(s) → defines schedule.
2. Admin imports CSV → contacts start as imported → bulk activate.
3. Worker enqueues sends → Resend delivers sequence emails with threading headers.
4. Resend webhooks record opens/clicks/bounces in `outreach_email_events`.
5. Recipient unsubscribes via signed link → contact opted out.

---

## Data Model (shipped)

| Table | Role |
|---|---|
| `outreach_campaigns` | Campaign config, templates, stats |
| `outreach_contacts` | Per-lead state, Resend message IDs per step |
| `outreach_schedules` | Business hours windows |
| `outreach_sender_accounts` | From mailboxes |
| `outreach_campaign_senders` | M2M campaign ↔ sender |
| `outreach_blocklist` | Suppression |
| `outreach_email_events` | Engagement events |

RPC: `increment_sender_count`, `update_campaign_stats`, `get_unique_tags`

---

## API Surface (shipped)

Campaigns, contacts, import, senders, automation, webhooks — full list in [`knowledge-base/api/outreach-api.md`](../../../knowledge-base/api/outreach-api.md).

Key automation:

- `POST /api/outreach/send-email` — enqueue single send
- `POST /api/outreach/process` — manual batch trigger
- `POST /api/outreach/webhooks/resend` — inbound events

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(dashboard)/outreach/` | Campaign UI |
| `components/outreach/` | Dialogs, tags, owner select |
| `app/api/outreach/` | REST + webhooks |
| `lib/outreach/campaigns/` | Campaign queries |
| `lib/outreach/contacts/` | Contact queries + import |
| `lib/outreach/sending/sender.ts` | **Locked Reply-To** send path |
| `lib/outreach/sending/processor.ts` | Due email batch |
| `lib/outreach/sending/deliverability.ts` | Strategy selection |
| `lib/outreach/scheduling/` | Business hours |
| `lib/outreach/webhooks/` | Resend event handlers |
| `lib/queue/index.ts` | `enqueueOutreachSendEmail` |
| `scripts/worker.ts` | Send + process handlers |

---

## Locked Constraints

- Reply-To = sender plain mailbox only (`CRITICAL: Reply-To` blocks)
- No `reply+<uuid>@` on new sends
- Test mode logs instead of sending when `campaign.test_mode`

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `lib/outreach/sending/__tests__/deliverability.test.ts` | Strategies |
| `lib/outreach/sending/__tests__/template.test.ts` | Email templates |
| `lib/outreach/sending/__tests__/threading.test.ts` | Message-ID threading |
| `lib/outreach/scheduling/__tests__/business-hours.test.ts` | Schedule windows |
| `lib/outreach/scheduling/__tests__/calculator.test.ts` | Send time calc |
| `lib/outreach/contacts/__tests__/import.test.ts` | CSV import |
| `lib/outreach/webhooks/__tests__/resend-handler.test.ts` | Webhook dispatch |
| `app/api/outreach/campaigns/[campaignId]/__tests__/route.test.ts` | Campaign API |

---

## Related docs

- [`knowledge-base/architecture/outreach-pipeline.md`](../../../knowledge-base/architecture/outreach-pipeline.md)
- [`knowledge-base/guides/locked-business-rules.md`](../../../knowledge-base/guides/locked-business-rules.md)

---

## Risks and Open Questions

- Domain throttle constants in `lib/constants.ts` — tune per sender reputation.
- `generateReplyToAddress` deprecated but retained for legacy inbound matching only.
