---
type: entity
title: "newsletter-edition-length module"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/edition-length.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/classes/NewsletterOrchestrator]]"
  - "[[entities/endpoints/post-api-newsletter-generate]]"
  - "[[entities/components/GenerateNewsletterDialog]]"
  - "[[entities/modules/newsletter-validations]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
related:
  - "[[entities/functions/resolveArticleLimit]]"
sources:
  - "lib/newsletter/edition-length.ts"
partial_scan: true
---

# newsletter-edition-length module

## Overview

Small utility module (`lib/newsletter/edition-length.ts`) that codifies the three newsletter length presets — `short` (3 stories), `medium` (8 stories), `long` (15 stories) — as a Zod enum, a lookup table, and two resolution helpers. Consumed by both the generate API route and the `GenerateNewsletterDialog` UI to keep article-count logic centralised.

## Signature / Definition

```ts
export const newsletterLengthSchema = z.enum(["short", "medium", "long"])
export type NewsletterLength = z.infer<typeof newsletterLengthSchema>
export const DEFAULT_NEWSLETTER_LENGTH: NewsletterLength = "medium"
export const NEWSLETTER_LENGTH_OPTIONS: Array<{value, label, description}>
export function articleLimitForLength(length: NewsletterLength): number
export function resolveArticleLimit(options: { length?: NewsletterLength; campaignArticleLimit?: number }): number
```

## Behavior

- `ARTICLE_LIMIT_BY_LENGTH`: `{ short: 3, medium: 8, long: 15 }` (`lib/newsletter/edition-length.ts:9–13`).
- `NEWSLETTER_LENGTH_OPTIONS` provides UI-friendly label + description strings for the Select dropdown (`lib/newsletter/edition-length.ts:15–35`).
- `articleLimitForLength` is a direct lookup with no fallback — caller must supply a valid `NewsletterLength`.
- `resolveArticleLimit` prefers the `length` preset; if absent, uses `campaignArticleLimit` (if > 0); otherwise falls back to `ARTICLE_LIMIT_BY_LENGTH["medium"]` = 8 (`lib/newsletter/edition-length.ts:41–52`).

## Connections

- **depends_on:** (zod only)
- **used_by:** [[entities/classes/NewsletterOrchestrator]], [[entities/endpoints/post-api-newsletter-generate]], [[entities/components/GenerateNewsletterDialog]], [[entities/modules/newsletter-validations]]
- **related:** [[entities/functions/resolveArticleLimit]]

## History

- **Last touched:** commit `40438e4`

## Sources

- `lib/newsletter/edition-length.ts` (lines 1–52)
