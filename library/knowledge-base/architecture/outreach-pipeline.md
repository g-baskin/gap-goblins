# Outreach Pipeline

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

End-to-end cold email flow: campaign setup → scheduled sends → Resend delivery → webhook events → inbox → optional CRM push.

**Related:**
- [`guides/locked-business-rules.md`](../guides/locked-business-rules.md)
- [`crm-pipeline.md`](crm-pipeline.md)
- [`lib/outreach/`](../../../lib/outreach/)

---

## Overview

Outreach is a **three-email sequence** per contact, sent through **Resend**, with business-hours scheduling, domain throttling, and deliverability strategies. Inbound replies arrive via Resend webhook, get AI analysis, and surface in the admin inbox.

---

## Flow diagram

```
┌─────────────┐    import CSV     ┌──────────────────┐
│ Admin UI    │ ───────────────► │ outreach_contacts │
│ /outreach   │                  └────────┬─────────┘
└──────┬──────┘                           │
       │ create campaign                   │ due / scheduled
       ▼                                   ▼
┌──────────────────┐              ┌─────────────────────┐
│ outreach_campaigns│◄────────────│ pg-boss             │
│ + schedules       │              │ outreach-send-email │
│ + sender_accounts │              │ outreach-process    │
└────────┬─────────┘              └──────────┬──────────┘
         │                                    │
         │         lib/outreach/sending/sender.ts
         ▼                                    ▼
    ┌─────────┐                         ┌──────────┐
    │ Resend  │ ─── deliver ──────────► │ Recipient│
    └────┬────┘                         └────┬─────┘
         │                                   │ reply
         │ webhook                           ▼
         ▼                          ┌─────────────────┐
┌────────────────────┐              │ outreach_replies │
│ outreach_email_    │              │ + AI analyzer    │
│ events             │              └────────┬─────────┘
└────────────────────┘                       │
                                             │ positive intent
                                             ▼
                                    ┌─────────────────┐
                                    │ pushToCrm       │
                                    │ (Contacted only)│
                                    └─────────────────┘
```

---

## Campaign lifecycle

1. **Create campaign** — templates for emails 1–3, sender assignment, tags, test mode flag.
2. **Import contacts** — CSV via `/api/outreach/import/[campaignId]`; validation in `lib/outreach/contacts/import.ts`.
3. **Activate** — contacts move to `active`; worker picks up due rows.
4. **Send** — `sendEmail()` renders template, sets threading headers, sends via Resend.
5. **Track** — Resend webhooks populate `outreach_email_events`.
6. **Reply** — `lib/outreach/webhooks/events/received.ts` matches thread via `In-Reply-To` / `References` → `email_{1,2,3}_resend_id`.

---

## Locked Reply-To rule

Outgoing emails **must** set `Reply-To` to the sender's plain mailbox (`sender@email.__YOUR_DOMAIN__`).

**Never** use `reply+<uuid>@...` on new sends. Matching uses Resend message IDs in threading headers instead.

Locked in:

- `lib/outreach/sending/sender.ts` (search `CRITICAL: Reply-To`)
- `app/api/outreach/replies/[replyId]/send/route.ts`

Regression: `app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts`.

Full detail: [`guides/locked-business-rules.md`](../guides/locked-business-rules.md).

---

## AI reply analysis

- Module: `lib/outreach/ai/reply-analyzer.ts`
- Classifies intent/sentiment; drafts suggested reply in **locked brand voice**.
- Eval harness: `bun scripts/eval-replies.ts`
- Tests: `lib/outreach/ai/__tests__/reply-analyzer.test.ts`

---

## CRM integration boundary

**Outreach replies never auto-promote past `Contacted`.** Only Cal.com `BOOKING_CREATED` moves deals to `Meeting Booked`.

`lib/outreach/crm/push-to-crm.ts` uses RPC `upsert_contact_with_hierarchy_protection` and creates/updates deals at the Contacted stage for positive replies.

Tests: `lib/outreach/crm/__tests__/push-to-crm.test.ts`.

---

## Scheduling & throttling

| Mechanism | Location | Behavior |
|---|---|---|
| Business hours | `lib/outreach/scheduling/business-hours.ts` | Reschedule if outside window |
| Domain throttle | worker + `getDomainSentLastHour` | Max sends per domain per hour |
| Deliverability | `lib/outreach/sending/deliverability.ts` | Text-only fallback strategies |
| Batch processor | `lib/outreach/sending/processor.ts` | Cron every 5 min |

---

## Unsubscribe

Public route: `/api/outreach/unsubscribe/[contactId]` — signed with `UNSUBSCRIBE_SECRET`.

---

## Related code

- `app/admin/(dashboard)/outreach/` — campaign UI
- `app/admin/(dashboard)/inbox/` — reply UI
- `app/api/outreach/` — REST surface ([`api/outreach-api.md`](../api/outreach-api.md))
- `app/api/outreach/webhooks/resend/route.ts` — inbound events

---

## Related docs

- [`requirements/features/feature-002-outreach-system/`](../../requirements/features/feature-002-outreach-system/)
- [`requirements/features/feature-003-inbox-and-ai-replies/`](../../requirements/features/feature-003-inbox-and-ai-replies/)

---

## Changelog

- v1.0 (2026-05) — Initial outreach pipeline doc.
