---
type: concept
title: "Newsletter Model Resolution"
complexity: intermediate
domain: "newsletter"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
aliases:
  - "model resolution chain"
  - "newsletter anthropic model priority"
tags:
  - concept
  - newsletter
  - ai
related:
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
  - "[[entities/modules/newsletter-anthropic-model]]"
  - "[[entities/classes/NewsletterOrchestrator]]"
  - "[[entities/classes/ArticleSummarizer]]"
sources:
  - "lib/newsletter/anthropic-model.ts"
partial_scan: true
---

# Newsletter Model Resolution

## Overview

The newsletter pipeline uses a three-level priority chain to determine which Anthropic Claude model to use for article summarization and subject-line generation. The chain was introduced this session when model-resolution logic was extracted from inline strings scattered across the orchestrator and summarizer into a dedicated `lib/newsletter/anthropic-model.ts` module.

## The Priority Chain

```
1. NEWSLETTER_ANTHROPIC_MODEL env var (highest priority)
       ↓ not set
2. campaign.summarizer_model (if not in RETIRED_NEWSLETTER_MODELS)
       ↓ absent or retired
3. DEFAULT_NEWSLETTER_ANTHROPIC_MODEL = "claude-sonnet-4-6"
```

**Level 1 — operator override:** Setting `NEWSLETTER_ANTHROPIC_MODEL` in the environment unconditionally wins. Used for testing new Claude versions or emergency rollbacks without a code deploy.

**Level 2 — campaign config:** Each newsletter campaign stores a `summarizer_model` column. Campaigns can pin a different Claude model per-campaign. Exception: if the stored model ID is in `RETIRED_NEWSLETTER_MODELS` (currently `{"claude-3-5-sonnet-20241022"}`), it is silently discarded and falls through to level 3. This prevents 404 errors from the Anthropic API when a previously-valid model ID is retired.

**Level 3 — default:** `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL = "claude-sonnet-4-6"` is the current production default. Changing it requires only updating `anthropic-model.ts` and running the companion migration `0010_fix_retired_newsletter_model.sql` for existing campaigns.

## Why a Central Module

Before this session, the orchestrator and summarizer both inlined a model string or defaulted differently. Centralising in `anthropic-model.ts` ensures:

- One place to bump the default model.
- One place to add a newly-retired model to `RETIRED_NEWSLETTER_MODELS`.
- The `createCampaignSchema` default in `lib/validations/newsletter.ts` imports the same constant, so the schema default stays in sync automatically.

## Connections

- Implementation: [[entities/functions/resolveNewsletterAnthropicModel]]
- Module: [[entities/modules/newsletter-anthropic-model]]
- Callers: [[entities/classes/NewsletterOrchestrator]], [[entities/classes/ArticleSummarizer]]
- DB back-fill: [[entities/0010_fix_retired_newsletter_model-sql]]

## Sources

- `lib/newsletter/anthropic-model.ts`
