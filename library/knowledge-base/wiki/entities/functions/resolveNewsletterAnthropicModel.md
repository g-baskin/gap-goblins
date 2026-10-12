---
type: entity
title: "resolveNewsletterAnthropicModel"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/anthropic-model.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/classes/NewsletterOrchestrator]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - ai
related:
  - "[[concepts/newsletter-model-resolution]]"
  - "[[entities/modules/newsletter-anthropic-model]]"
sources:
  - "lib/newsletter/anthropic-model.ts"
partial_scan: true
---

# resolveNewsletterAnthropicModel

## Overview

Exported function that resolves which Claude model ID to use for newsletter generation. Implements a three-level priority chain so individual campaigns can customise the model without coupling to env configuration, while retired API models are automatically remapped to the current default. Called by `NewsletterOrchestrator.generateNewsletter` before any Anthropic API call (`lib/newsletter/orchestrator.ts:158`).

## Signature / Definition

```ts
export function resolveNewsletterAnthropicModel(campaignModel?: string | null): string
```

## Behavior

**Input:** optional `campaignModel` string (stored on a `newsletter_campaigns` row as `summarizer_model`).

**Priority chain** (`lib/newsletter/anthropic-model.ts:11–22`):

1. If `process.env.NEWSLETTER_ANTHROPIC_MODEL` is set and non-empty, return it immediately (operator override wins).
2. Else if `campaignModel` is provided **and** not in `RETIRED_NEWSLETTER_MODELS`, return `campaignModel`.
3. Else return `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` (`"claude-sonnet-4-6"`).

**Retired model guard:** `RETIRED_NEWSLETTER_MODELS` is a module-private `Set` currently containing `"claude-3-5-sonnet-20241022"`. Any campaign row still holding that model ID is silently remapped to the default. The companion migration `0010_fix_retired_newsletter_model.sql` back-fills the database so most calls will never hit this branch after the migration runs.

**No side effects.** Pure function; does not mutate state or write to the database.

## Connections

- **depends_on:** [[entities/modules/newsletter-anthropic-model]] (reads `RETIRED_NEWSLETTER_MODELS`, `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL`)
- **used_by:** [[entities/classes/NewsletterOrchestrator]]
- **related concepts:** [[concepts/newsletter-model-resolution]]

## History

- **Created:** commit `40438e4` — extracted from inline model references (this session)

## Sources

- `lib/newsletter/anthropic-model.ts` (lines 11–22)
