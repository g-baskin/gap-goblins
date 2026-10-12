---
type: entity
title: "NEWSLETTER_ANTHROPIC_MODEL"
entity_type: env-var
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/anthropic-model.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - env-var
related:
  - "[[concepts/newsletter-model-resolution]]"
sources:
  - "lib/newsletter/anthropic-model.ts"
partial_scan: true
---

# NEWSLETTER_ANTHROPIC_MODEL

## Overview

Optional environment variable that overrides the Claude model used for newsletter generation at the operator level. When set, `resolveNewsletterAnthropicModel` returns its value immediately, ignoring both the campaign-level `summarizer_model` and the compiled-in default. Useful for testing new model versions or emergency rollbacks without a code deploy.

## Behavior

- Read in `resolveNewsletterAnthropicModel` as `process.env.NEWSLETTER_ANTHROPIC_MODEL?.trim()` (`lib/newsletter/anthropic-model.ts:12–14`).
- No validation — whatever string is set is passed directly to the Anthropic API. Setting a non-existent model ID will cause the API to return a 404-like error, which the generate route classifies as `"AI model not found"` (`app/api/newsletter/generate/route.ts:213–215`).
- **Not set by default.** Not present in `.env.example`; must be added manually when needed.

## Connections

- **used_by:** [[entities/functions/resolveNewsletterAnthropicModel]]
- **related:** [[concepts/newsletter-model-resolution]]

## History

- **Created:** commit `40438e4` — introduced alongside `anthropic-model.ts` (this session)

## Sources

- `lib/newsletter/anthropic-model.ts` (lines 12–14)
