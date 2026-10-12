---
type: entity
title: "newsletter-anthropic-model module"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/anthropic-model.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
  - "[[entities/classes/ArticleSummarizer]]"
  - "[[entities/modules/newsletter-validations]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - ai
related:
  - "[[concepts/newsletter-model-resolution]]"
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
sources:
  - "lib/newsletter/anthropic-model.ts"
partial_scan: true
---

# newsletter-anthropic-model module

## Overview

Single-file module (`lib/newsletter/anthropic-model.ts`) that owns the Anthropic Claude model identifier used across the newsletter pipeline. It exports the default model constant, a set of retired (404-returning) model IDs, and the `resolveNewsletterAnthropicModel` function that applies a three-level priority chain: env override → non-retired campaign override → default. Added in this session to replace inline model string literals scattered across the orchestrator and summarizer.

## Signature / Definition

```ts
export const DEFAULT_NEWSLETTER_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const RETIRED_NEWSLETTER_MODELS = new Set(["claude-3-5-sonnet-20241022"]);
export function resolveNewsletterAnthropicModel(campaignModel?: string | null): string
```

## Behavior

- `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` is the canonical fallback model ID (`lib/newsletter/anthropic-model.ts:2`).
- `RETIRED_NEWSLETTER_MODELS` is a module-private `Set`; any model in this set that is stored on a campaign row is treated as invalid and remapped to the default (`lib/newsletter/anthropic-model.ts:5`).
- Resolution order: `NEWSLETTER_ANTHROPIC_MODEL` env var → `campaignModel` (if not in retired set) → `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` (`lib/newsletter/anthropic-model.ts:11–22`).

## Connections

- **depends_on:** (none — zero imports)
- **used_by:** [[entities/classes/NewsletterOrchestrator]], [[entities/classes/ArticleSummarizer]], [[entities/modules/newsletter-validations]]
- **related concepts:** [[concepts/newsletter-model-resolution]]

## History

- **Created:** commit `40438e4` — newsletter module changes (this session)
- **Last touched:** commit `40438e4`

## Sources

- `lib/newsletter/anthropic-model.ts` (lines 1–22)
