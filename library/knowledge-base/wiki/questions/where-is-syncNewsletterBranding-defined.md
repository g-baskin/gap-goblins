---
type: question
title: "Where is syncNewsletterBranding defined?"
question: "What does lib/branding/sync-newsletter-branding.ts write to newsletter_settings, and which fields map from site_settings?"
answer_quality: definitive
created: "2026-05-28"
updated: "2026-05-28"
status: resolved
tags:
  - question
  - branding
related:
  - "[[entities/syncNewsletterBranding]]"
  - "[[entities/endpoints/api-admin-site-settings]]"
  - "[[entities/functions/formatPostalAddress]]"
sources:
  - "lib/branding/sync-newsletter-branding.ts"
---

# Where is syncNewsletterBranding defined?

## Resolution (2026-05-28)

**Status: resolved.** Full entity page created at [[entities/syncNewsletterBranding]].

## Answer

`lib/branding/sync-newsletter-branding.ts` (lines 26–76) implements an upsert pattern:

- **branding JSON:** merges prior value; overrides `logo` (absolute URL via `NEXT_PUBLIC_SITE_URL` prefix) and `primaryColor`.
- **sender JSON:** merges prior; overrides `name` from `senderName ?? businessName`.
- **footer JSON:** merges prior; overrides `companyName` and `address` (built by [[entities/functions/formatPostalAddress]]).
- If row exists → `db.update(newsletterSettings)`.
- If no row → `db.insert(newsletterSettings)` with `template: "curated-brief"`.

Callers: [[entities/endpoints/api-admin-site-settings]] (`app/api/admin/site-settings/route.ts:113-127`).
