---
type: entity
title: "newsletter-validations module"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/validations/newsletter.ts"
language: ts
depends_on:
  - "[[entities/modules/newsletter-anthropic-model]]"
  - "[[entities/modules/newsletter-edition-length]]"
used_by:
  - "[[entities/endpoints/post-api-newsletter-generate]]"
  - "[[entities/endpoints/post-api-newsletter-subscribe]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - validation
related: []
sources:
  - "lib/validations/newsletter.ts"
partial_scan: true
---

# newsletter-validations module

## Overview

Zod validation schemas for all newsletter API endpoints. Modified this session to import `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` from `lib/newsletter/anthropic-model` (instead of inlining the string) and to add `topic`, `sources`, and `length` fields to `generateNewsletterSchema`.

## Signature / Definition

```ts
export const newsletterSubscribeSchema     // public subscribe: email, consent: true, optional profile fields
export type NewsletterSubscribeInput
export const generateNewsletterSourceSchema  // { name: str, url: url }
export const generateNewsletterSchema        // campaignId?, manual?, topic?, sources?, length?
export type GenerateNewsletterRequest
export const sendNewsletterSchema            // testMode?, testEmail?
export type SendNewsletterRequest
export const updateNewsletterSchema          // subject?, preheader?, contentHtml?, contentText?, status?, scheduledAt?
export type UpdateNewsletterRequest
export const previewPersonalizationSchema    // firstName?, email?
export type PreviewPersonalizationRequest
export const createCampaignSchema            // full campaign creation
export type CreateCampaignRequest
export const updateCampaignSchema            // partial campaign update
export type UpdateCampaignRequest
```

## Behavior

**`newsletterSubscribeSchema`** (`lib/validations/newsletter.ts:14-25`):
- `email`: required, lowercased, trimmed.
- `consent`: must be literal `true`.
- Optional: `first_name`, `last_name`, `business_name`, `industry`, `source`, `referrer`.

**`generateNewsletterSchema`** key fields (`lib/validations/newsletter.ts:37-43`):
- `topic`: `z.string().max(500).optional()` — steers `applyTopicBoost` and subject line generation.
- `sources`: `z.array(generateNewsletterSourceSchema).min(1).max(20).optional()` — inline RSS override.
- `length`: `newsletterLengthSchema.optional().default("medium")` — resolves to article count.

**`createCampaignSchema`** references `DEFAULT_NEWSLETTER_ANTHROPIC_MODEL` as default for `summarizerModel` field (`lib/validations/newsletter.ts:73`) — keeps default in sync with the `anthropic-model` module.

## Connections

- **depends_on:** [[entities/modules/newsletter-anthropic-model]], [[entities/modules/newsletter-edition-length]]
- **used_by:** [[entities/endpoints/post-api-newsletter-generate]], [[entities/endpoints/post-api-newsletter-subscribe]]

## History

- **Modified:** commit `40438e4` — added topic/sources/length; imports model constant (this session)

## Sources

- `lib/validations/newsletter.ts` (lines 1–121)
