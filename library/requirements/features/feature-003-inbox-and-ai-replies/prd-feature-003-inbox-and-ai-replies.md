# Feature #003: Inbox and AI Replies (Retroactive)

> **template-crm / admin-platform** — Feature PRD #003
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P0
> **Schema changes:** `outreach_replies`, `email_replies`; PG NOTIFY for realtime

---

## Phase Overview

### Problem statement

When prospects reply to cold emails, admins need a threaded inbox with intent/sentiment classification, AI-drafted responses in a consistent brand voice, and the ability to send replies that preserve threading — while optionally pushing qualified conversations into CRM.

### Goals (as shipped)

- Inbound reply ingestion via Resend webhook with header-based thread matching.
- Admin inbox UI with badges, threaded view, composer.
- Anthropic-powered analysis + suggested reply (`reply-analyzer.ts`).
- Admin send path with locked Reply-To and quoted history stripping.
- SSE realtime updates on new replies.
- Positive replies push to CRM at Contacted stage only.

### Scope

- `/admin/inbox`
- `/api/outreach/replies/*`, `/api/outreach/threads/*`
- `lib/outreach/ai/reply-analyzer.ts`
- `lib/outreach/webhooks/events/received.ts`
- `lib/realtime/` SSE + PG listener

---

## User Flows (as shipped)

1. Prospect replies → Resend webhook → `received.ts` matches contact via In-Reply-To/References.
2. Reply row created → AI analyzer runs → intent/sentiment/suggested reply stored.
3. Admin opens inbox → filters by status/intent → reviews thread.
4. Admin edits/sends reply → `POST .../replies/[id]/send` → Resend with plain Reply-To.
5. If positive intent → `pushToCrm` (does not exceed Contacted stage).

---

## Data Model (shipped)

| Table | Role |
|---|---|
| `outreach_replies` | Inbound + outbound reply records, AI fields |
| `outreach_contacts` | `email_1/2/3_resend_id` for threading |
| `email_replies` | Generic reply storage (adjacent) |

Trigger: `notify_outreach_reply_inserted()` — `lib/db/drizzle/0003_inbox_realtime_notify.sql`

---

## API Surface (shipped)

| Method | Path |
|---|---|
| GET | `/api/outreach/replies` |
| GET, PATCH | `/api/outreach/replies/[replyId]` |
| POST | `/api/outreach/replies/[replyId]/send` |
| GET | `/api/outreach/replies/stream` |
| GET | `/api/outreach/threads/[contactId]` |

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(dashboard)/inbox/` | Inbox pages |
| `components/admin/EmailThread.tsx` | Thread UI |
| `components/admin/ReplyComposer.tsx` | Compose + send |
| `app/api/outreach/replies/` | Reply API |
| `lib/outreach/ai/reply-analyzer.ts` | **Locked AI voice** |
| `lib/outreach/webhooks/events/received.ts` | Inbound matching |
| `lib/outreach/crm/push-to-crm.ts` | CRM push on positive |
| `lib/email/strip-quoted-history.ts` | Quote stripping |
| `lib/realtime/sse-manager.ts` | SSE broadcast |
| `lib/realtime/pg-listener.ts` | LISTEN/NOTIFY |
| `scripts/eval-replies.ts` | Prompt eval harness |

---

## Locked Constraints

- AI voice rules in `SYSTEM_PROMPT` (no "AI automation", no em-dashes, AU English, dynamic signoff)
- Reply-To on admin send = sender plain mailbox
- CRM promotion capped at Contacted from outreach

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `lib/outreach/ai/__tests__/reply-analyzer.test.ts` | Voice + prompt invariants |
| `app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts` | Reply-To lock |
| `app/api/outreach/replies/__tests__/route.test.ts` | List/filter API |
| `app/api/outreach/replies/[replyId]/__tests__/route.test.ts` | Single reply |
| `app/api/outreach/replies/stream/__tests__/route.test.ts` | SSE |
| `app/api/outreach/threads/[contactId]/__tests__/route.test.ts` | Threads |
| `lib/outreach/webhooks/events/__tests__/received.test.ts` | Header matching |
| `lib/outreach/webhooks/__tests__/auto-reply-detector.test.ts` | OOO detection |
| `lib/email/__tests__/strip-quoted-history.test.ts` | Quote strip |
| `lib/realtime/__tests__/sse-manager.test.ts` | SSE |
| `lib/realtime/__tests__/pg-listener.test.ts` | NOTIFY |

---

## Related docs

- [`knowledge-base/architecture/outreach-pipeline.md`](../../../knowledge-base/architecture/outreach-pipeline.md)
- [`knowledge-base/guides/locked-business-rules.md`](../../../knowledge-base/guides/locked-business-rules.md)

---

## Risks and Open Questions

- Live Anthropic calls in eval harness cost money — use sparingly in CI.
- Restart dev server after prompt edits to avoid stale webhook module cache.
