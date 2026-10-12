---
type: entity
title: "NewsletterOrchestrator"
entity_type: class
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/orchestrator.ts"
language: ts
depends_on:
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
  - "[[entities/modules/newsletter-edition-length]]"
  - "[[entities/modules/db-client]]"
used_by:
  - "[[entities/functions/createNewsletterOrchestrator]]"
  - "[[entities/endpoints/post-api-newsletter-generate]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - ai
  - class
related:
  - "[[concepts/newsletter-model-resolution]]"
sources:
  - "lib/newsletter/orchestrator.ts"
partial_scan: true
---

# NewsletterOrchestrator

## Overview

Core class that coordinates the full newsletter generation workflow. Holds a single `Anthropic` client and an `rss-parser` instance. Not exported directly — callers use the `createNewsletterOrchestrator` factory. Modified this session to accept a resolved model string in `summarizeArticles` and to gain the `applyTopicBoost` private method (`lib/newsletter/orchestrator.ts:137`).

## Signature / Definition

```ts
class NewsletterOrchestrator {
  private anthropic: Anthropic;
  private rssParser: Parser;
  constructor(config: OrchestratorConfig)
  async generateNewsletter(options: GenerateOptions): Promise<NewsletterResult>
  private async fetchArticles(options: GenerateOptions): Promise<Article[]>
  private async scoreArticles(articles: Article[]): Promise<Article[]>
  private applyTopicBoost(articles: Article[], topic?: string): Article[]  // NEW
  private async summarizeArticles(articles: Article[], model: string): Promise<EnrichedArticle[]>
  private async generateNewsletterContent(...): Promise<{subject; preheader; html; text}>
  private generateHTML(...): string
  private generateText(...): string
  private async storeNewsletter(...): Promise<string>
  private generateArticleId(url: string): string
}
```

## Behavior

**`generateNewsletter`** is the single public entry point (`lib/newsletter/orchestrator.ts:157`). Execution order:

1. Resolves the Anthropic model via `resolveNewsletterAnthropicModel(options.campaignConfig?.summarizer_model)` (`lib/newsletter/orchestrator.ts:158`).
2. Fetches up to 24-hours-old articles from configured RSS sources (`fetchArticles`).
3. Scores articles by recency (40%), content length (40%), and title length (20%) (`scoreArticles`, `lib/newsletter/orchestrator.ts:276`).
4. **NEW:** Calls `applyTopicBoost` to re-rank scored articles by keyword overlap with `options.topic` (`lib/newsletter/orchestrator.ts:182`).
5. Slices to `articleLimit` from `resolveArticleLimit(...)` (`lib/newsletter/orchestrator.ts:176`).
6. Calls `summarizeArticles(topArticles, anthropicModel)` — now receives the resolved model string rather than deriving it internally (`lib/newsletter/orchestrator.ts:187`).
7. Calls `generateNewsletterContent` to produce HTML/text and an AI-generated subject line.
8. Inserts into `newsletter_editions` via Drizzle and returns the new UUID (`storeNewsletter`).

**RSS source priority** (`resolveRssSources`, `lib/newsletter/orchestrator.ts:118`): inline `options.sources` → campaign config sources → `DEFAULT_RSS_SOURCES`.

**`applyTopicBoost`** — see [[entities/functions/applyTopicBoost]] for detail.

**Error handling:** if no articles are found, throws immediately. Per-article summarization errors are caught and the article is included with a truncated-content fallback.

## Connections

- **depends_on:** [[entities/functions/resolveNewsletterAnthropicModel]], [[entities/modules/newsletter-edition-length]], [[entities/modules/db-client]]
- **used_by:** [[entities/functions/createNewsletterOrchestrator]]
- **related concepts:** [[concepts/newsletter-model-resolution]]

## History

- **Modified:** commit `40438e4` — added `applyTopicBoost`; `summarizeArticles` now accepts explicit `model` param (this session)

## Sources

- `lib/newsletter/orchestrator.ts` (lines 137–593)
