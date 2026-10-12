---
type: entity
title: "ArticleSummarizer"
entity_type: class
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/modules/processing/summarizer.ts"
language: ts
depends_on:
  - "[[entities/modules/newsletter-anthropic-model]]"
used_by: []
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - ai
  - class
related:
  - "[[entities/classes/NewsletterOrchestrator]]"
sources:
  - "lib/newsletter/modules/processing/summarizer.ts"
partial_scan: true
---

# ArticleSummarizer

## Overview

Full-featured standalone summarization class in `lib/newsletter/modules/processing/summarizer.ts`. Wraps the Anthropic Claude API with caching (`SummaryCache`), rate limiting (`RateLimiter`), retry/backoff logic, and a structured JSON response parser. Provides both single-article (`summarize`) and batch (`summarizeBatch`) entry points. Uses a psychology-optimised system prompt targeting business-owner audiences. Modified this session to import `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` from `../../anthropic-model` instead of inlining the model string.

## Signature / Definition

```ts
export class ArticleSummarizer {
  constructor(config: SummarizerConfig)
  async summarize(article: ArticleInput): Promise<SummarizerResult>
  async summarizeBatch(articles: ArticleInput[], options?: BatchSummarizationOptions): Promise<BatchSummarizationResult>
  getCacheStats(): CacheStats | null
  getRateLimitStatus(): RateLimitStatus | null
  clearCache(): void
  destroy(): void
}
```

## Behavior

**Constructor** merges caller config with `DEFAULT_CONFIG` (defaults: model=`DEFAULT_NEWSLETTER_ANTHROPIC_MODEL`, maxTokens=1024, temp=0.3, cache 7-day TTL, 50 req/min, 50k tokens/min, 3 retries, `lib/newsletter/modules/processing/summarizer.ts:23–35`).

**`summarize`** flow (`lib/newsletter/modules/processing/summarizer.ts:170`):
1. Validates article (id, title, content ≥100 chars, url, publishedAt).
2. Checks `SummaryCache` keyed by url+content hash.
3. Checks rate limits (`RateLimiter.checkLimit(2000)`).
4. Calls `summarizeWithRetry` → Anthropic API with `SYSTEM_PROMPT` + `createUserPrompt(article)`.
5. Parses JSON response (strips markdown fences); validates `summary` and `keyInsights` fields.
6. Returns `EnrichedArticle` with `summary`, `keyInsights`, optional `psychologyPrinciple`, optional `actionableFramework`, and `metadata` (model, tokens, timing, fromCache).

**`summarizeBatch`** processes articles in chunks of `concurrency` (default 5) using `Promise.allSettled`, tracking stats and invoking optional `onProgress` callback (`lib/newsletter/modules/processing/summarizer.ts:217`).

**Retry logic:** exponential backoff (`retryBaseDelayMs * 2^(attempt-1)`) on 429, 5xx, and network errors. Max 3 retries by default.

**`SYSTEM_PROMPT`** steers Claude to use loss-framing, pattern language, and scannable bullets for 8-second-attention-span business owners (`lib/newsletter/modules/processing/summarizer.ts:40–59`).

## Connections

- **depends_on:** [[entities/modules/newsletter-anthropic-model]] (imports `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL`)
- **related:** [[entities/classes/NewsletterOrchestrator]] (parallel summarizer — orchestrator uses an inline approach; this class is the richer standalone version)

## History

- **Modified:** commit `40438e4` — now imports model constant from `anthropic-model.ts` (this session)

## Sources

- `lib/newsletter/modules/processing/summarizer.ts` (lines 1–559)
