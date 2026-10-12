# Feature #004: Newsletter Engine (Retroactive)

> **template-crm / admin-platform** — Feature PRD #004
>
> **Status:** Shipped — ongoing iteration (last amended 2026-05-28)
> **Priority:** P1
> **Schema changes:** `newsletter_subscribers`, `newsletter_editions`, `newsletter_articles`, `newsletter_campaigns`, `newsletter_send_queue`, `newsletter_events`, `newsletter_settings`

---

## Phase Overview

### Problem statement

Operators need to curate third-party content, generate newsletter editions with AI, preview in admin, and batch-send to subscribers via Resend — with queue-backed reliability and rate limiting.

### Goals (as shipped)

- Multi-source curation (RSS, Hacker News, Reddit).
- Article scoring, filtering, summarization pipeline.
- AI edition generation with React Email templates.
- pg-boss workflows: curate, generate, publish, cleanup, combined send.
- Subscriber management and send queue with event tracking.
- Stats API and admin preview.

### Scope

- `/admin/newsletter`
- `/api/newsletter/*`
- Worker jobs in `scripts/worker.ts` + `lib/newsletter/lib/queue/jobs/`
- Cron schedule route for automated sends

---

## User Flows (as shipped)

1. Admin configures sources in newsletter settings.
2. Admin triggers curate → articles scored and stored.
3. Admin triggers generate → edition draft with HTML body.
4. Admin previews edition → sends test → publishes to subscribers.
5. Worker publishes in batches with rate limiter → events recorded.

Alternative: single `newsletter-send` job runs curate → generate → publish chain.

---

## Data Model (shipped)

| Table | Role |
|---|---|
| `newsletter_subscribers` | Audience list |
| `newsletter_editions` | Edition metadata + content |
| `newsletter_articles` | Curated articles |
| `newsletter_campaigns` | Send batch grouping |
| `newsletter_send_queue` | Per-recipient queue rows |
| `newsletter_events` | Opens/clicks/delivery |
| `newsletter_settings` | Global config |

---

## API Surface (shipped)

Full reference: [`knowledge-base/api/newsletter-api.md`](../../../knowledge-base/api/newsletter-api.md)

Queues: `newsletter-send`, `newsletter-curate`, `newsletter-publish`, `newsletter-cleanup`

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(dashboard)/newsletter/` | Admin UI |
| `app/api/newsletter/` | REST handlers |
| `app/api/cron/newsletter-schedule/route.ts` | Cron trigger |
| `lib/newsletter/modules/sources/` | RSS, HN, Reddit fetchers |
| `lib/newsletter/modules/processing/` | Filter, scorer, summarizer |
| `lib/newsletter/modules/generation/` | Edition template |
| `lib/newsletter/modules/publishing/` | Email send + rate limit |
| `lib/newsletter/lib/queue/jobs/` | curate, generate, publish, cleanup |
| `lib/newsletter/emails/` | React Email templates |
| `lib/newsletter/anthropic-model.ts` | Default model constant + `resolveNewsletterAnthropicModel()` |
| `lib/queue/index.ts` | Enqueue helpers |
| `scripts/worker.ts` | Worker handlers |

---

## Locked Constraints

- From address via `NEWSLETTER_FROM_EMAIL` env — never hardcoded
- Subscriber CRM status protected separately (hierarchy RPC if synced)
- Anthropic model resolved through `resolveNewsletterAnthropicModel()` in `lib/newsletter/anthropic-model.ts` — never hardcode a model string directly in orchestrator or summarizer. The resolver remaps any retired model slug to `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` (`claude-sonnet-4-6`).

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `app/api/newsletter/__tests__/route.test.ts` | Edition CRUD |
| `app/api/newsletter/stats/__tests__/route.test.ts` | Stats |
| `app/__tests__/api/newsletter/generate.test.ts` | Generation API |
| `lib/newsletter/lib/queue/__tests__/worker.test.ts` | Worker integration |
| `lib/newsletter/lib/queue/__tests__/newsletter-queue.test.ts` | Queue ops |
| `lib/newsletter/modules/sources/__tests__/*` | Source fetchers |
| `lib/newsletter/modules/processing/__tests__/*` | Scoring/filter |
| `lib/newsletter/modules/publishing/__tests__/*` | Send + rate limit |
| `lib/newsletter/lib/resilience/__tests__/*` | Circuit breaker, retry |
| `lib/newsletter/__tests__/anthropic-model.test.ts` | Model resolver + remapping |

---

## Related docs

- [`knowledge-base/architecture/newsletter-pipeline.md`](../../../knowledge-base/architecture/newsletter-pipeline.md)
- [`knowledge-base/architecture/queue-and-worker.md`](../../../knowledge-base/architecture/queue-and-worker.md)
- [`feature-008-newsletter-subscriber-signup/`](../feature-008-newsletter-subscriber-signup/) — public signup, verify, unsubscribe, admin form hub (2026-05-28)

---

## Risks and Open Questions

- External source APIs (Reddit/HN) may rate-limit — resilience layer mitigates.
- Large subscriber lists require batch tuning in publish job.

---

## Session Amendments — 2026-05-28

### Round 1 — Newsletter generate failure fixes

**Problem:** Newsletter generation was failing silently due to a retired Anthropic model slug (`claude-3-5-sonnet-20241022`) and a `summarizerModel` camelCase → snake_case mapping gap in the generate route.

**Changes shipped:**

| File | Change |
|---|---|
| `lib/newsletter/anthropic-model.ts` | **New.** Defines `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL = "claude-sonnet-4-6"` and `resolveNewsletterAnthropicModel(model?)` which remaps the retired slug to the default. |
| `lib/newsletter/orchestrator.ts` | `summarizeArticles` + `generateNewsletterContent` now call `resolveNewsletterAnthropicModel()` instead of a hardcoded string. |
| `lib/newsletter/modules/processing/summarizer.ts` | Default model updated via `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` import. |
| `app/api/newsletter/generate/route.ts` | `summarizerModel` (Drizzle camelCase) now correctly mapped to `summarizer_model` (snake_case `CampaignConfig`); catch block classifies errors (model-404, missing API key, no articles) with user-facing messages; debug instrumentation removed. |
| `lib/validations/newsletter.ts` | `summarizerModel` default updated to `claude-sonnet-4-6`. |
| `lib/db/drizzle/0010_fix_retired_newsletter_model.sql` | **Data migration.** Updates existing campaign rows from the retired model slug to `claude-sonnet-4-6`. |
| `components/newsletter/GenerateNewsletterDialog.tsx` | Error toast now prefers the classified server message over a generic fallback; topic hint text updated. |
| `lib/newsletter/__tests__/anthropic-model.test.ts` | **New.** Tests for `resolveNewsletterAnthropicModel()` covering pass-through and remap cases. |

---

### Round 2 — Newsletter UI polish

**Problem:** Topic field had no effect on which articles were selected (only shaped the subject line), and the edition editor was a plain textarea with no formatting capability. Admin had no way to send or mark an edition as sent from the table.

**Changes shipped:**

| File | Change |
|---|---|
| `lib/newsletter/orchestrator.ts` | `applyTopicBoost` private method added: extracts keywords from topic string, scores articles by keyword overlap (0–1 × 20 points), re-sorts before slicing. Topic now influences article selection, not just the subject line. |
| `components/newsletter/GenerateNewsletterDialog.tsx` | Topic hint updated to "Boosts articles matching this topic to the top and shapes the subject line". |
| `components/newsletter/NewsletterEditionSheet.tsx` | **Full rewrite.** Two-tab editor: **Visual** (Tiptap WYSIWYG with toolbar — bold, italic, underline, H2/H3, lists, align, link) and **HTML** (raw textarea). `extractBody`/`replaceBody` helpers isolate `<body>` content from full email HTML. Tab switching syncs content bidirectionally; save flushes Tiptap output back into full HTML. Sheet widened to `sm:max-w-2xl`. |
| `app/globals.css` | Minimal ProseMirror/Tiptap base styles added. |
| `app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx` | `handleSend` (POST `/api/newsletter/:id/send` + confirm dialog + toast) and `handleMarkSent` (PATCH `status: "sent"`) added; two new dropdown items ("Send newsletter", "Mark as sent") for draft rows. |

---

### Round 3 — Subscriber signup restore (feature #008)

Public opt-in front door restored. Full spec: [`feature-008-newsletter-subscriber-signup/`](../feature-008-newsletter-subscriber-signup/).

Key additions: `lib/newsletter/subscribers.ts`, public `/newsletter/*` pages, subscribe/verify/unsubscribe API routes, admin subscribers list, subscribe-form settings hub.
