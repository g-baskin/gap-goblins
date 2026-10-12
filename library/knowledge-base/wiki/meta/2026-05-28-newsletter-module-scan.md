---
type: meta
title: "2026-05-28 Newsletter Module Scan"
report_type: contradiction
date: 2026-05-28
contradiction_count: 0
tags:
  - meta
  - newsletter
partial_scan: true
---

# 2026-05-28 Newsletter Module Scan

## Summary

Partial scan covering the newsletter module changes made in this session. All 15 pages (13 entity + 1 concept + 1 env-var) are **first-document** writes — no prior newsletter wiki pages existed, so no contradiction protocol was triggered. No `[!stale]` or `[!contradiction]` callouts were required.

## Scope

Files scanned:
- `lib/newsletter/anthropic-model.ts` (NEW)
- `lib/newsletter/orchestrator.ts` (MODIFIED)
- `lib/newsletter/modules/processing/summarizer.ts` (MODIFIED)
- `lib/newsletter/edition-length.ts` (existing, relevant)
- `app/api/newsletter/generate/route.ts` (MODIFIED)
- `lib/validations/newsletter.ts` (MODIFIED)
- `lib/db/drizzle/0010_fix_retired_newsletter_model.sql` (NEW)
- `components/newsletter/NewsletterEditionSheet.tsx` (MODIFIED — major rewrite)
- `components/newsletter/GenerateNewsletterDialog.tsx` (MODIFIED)
- `app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx` (MODIFIED)

## Pages Created

| Page | Type |
|---|---|
| `entities/modules/newsletter-anthropic-model.md` | module |
| `entities/functions/resolveNewsletterAnthropicModel.md` | function |
| `entities/classes/NewsletterOrchestrator.md` | class |
| `entities/functions/applyTopicBoost.md` | function |
| `entities/functions/createNewsletterOrchestrator.md` | function |
| `entities/classes/ArticleSummarizer.md` | class |
| `entities/modules/newsletter-edition-length.md` | module |
| `entities/endpoints/post-api-newsletter-generate.md` | endpoint |
| `entities/components/NewsletterEditionSheet.md` | react-component |
| `entities/components/GenerateNewsletterDialog.md` | react-component |
| `entities/components/NewslettersTable.md` | react-component |
| `entities/modules/newsletter-validations.md` | module |
| `entities/0010_fix_retired_newsletter_model-sql.md` | sql stub |
| `entities/env-vars/NEWSLETTER_ANTHROPIC_MODEL.md` | env-var |
| `concepts/newsletter-model-resolution.md` | concept |

## Contradictions

None. All pages are first-document writes.

## Gaps

The following entities were referenced but not fully scanned (not in the explicit scope):

- `DEFAULT_RSS_SOURCES` — imported by orchestrator and `GenerateNewsletterDialog`; module not in scan scope.
- `SummaryCache` and `RateLimiter` — used by `ArticleSummarizer`; modules not in scan scope.
- `GET /api/newsletter/{id}` and `PATCH /api/newsletter/{id}` routes — used by `NewsletterEditionSheet`; not in scan scope.
- `POST /api/newsletter/{id}/send` — used by `NewslettersTable`; not in scan scope.

## Notes

- `partial_scan: true` set on all pages. TS driver must run reconciliation pass to update `index.md`, `_index.md` indexes, `log.md`, and `hot.md`.
- `entities/classes/` subdirectory created (did not exist previously).
