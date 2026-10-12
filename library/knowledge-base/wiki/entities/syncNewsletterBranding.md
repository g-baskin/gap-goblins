---
type: entity
title: "syncNewsletterBranding"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/branding/sync-newsletter-branding.ts"
language: ts
depends_on:
  - "[[entities/functions/formatPostalAddress]]"
used_by:
  - "[[entities/endpoints/api-admin-site-settings]]"
last_commit_hash: "91aec3d"
tested_by: []
tags:
  - entity
  - branding
  - newsletter
related:
  - "[[concepts/newsletter-double-opt-in-flow]]"
sources:
  - "lib/branding/sync-newsletter-branding.ts"
---

# syncNewsletterBranding

## Overview

Server-only async function that propagates site-settings branding fields into the `newsletter_settings` row via upsert (`lib/branding/sync-newsletter-branding.ts:26-76`). Called after a brand save or import-from-website apply. Uses a merge strategy — existing values in `branding`, `sender`, and `footer` JSON columns are preserved for fields not supplied in the input.

## Signature

```ts
export async function syncNewsletterBranding(input: SyncInput): Promise<void>

type SyncInput = {
  businessName?: string | null;
  senderName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  email?: string | null;
  website?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostcode?: string | null;
  addressCountry?: string | null;
};
```

## Behavior

1. Reads `NEXT_PUBLIC_SITE_URL` to build an absolute logo URL (`lib/branding/sync-newsletter-branding.ts:27`).
2. Selects the existing `newsletter_settings` row (limit 1) to get prior `branding`, `sender`, and `footer` JSON (`lib/branding/sync-newsletter-branding.ts:29-33`).
3. **Branding merge:** spreads prior branding; overrides `logo` (prefixed with siteUrl if supplied) and `primaryColor` (falls back to `#3B82F6`) (`lib/branding/sync-newsletter-branding.ts:35-44`).
4. **Sender merge:** copies prior sender, overrides `name` from `senderName ?? businessName` (`lib/branding/sync-newsletter-branding.ts:46-51`).
5. **Footer merge:** calls `formatPostalAddress(input)` to build physical address string; merges `companyName` and `address` (`lib/branding/sync-newsletter-branding.ts:53-59`).
6. If row exists → `db.update(newsletterSettings)` (`lib/branding/sync-newsletter-branding.ts:61-67`).
7. If no row → `db.insert(newsletterSettings)` with `template: "curated-brief"` (`lib/branding/sync-newsletter-branding.ts:68-75`).

## Connections

- **depends_on:** [[entities/functions/formatPostalAddress]]
- **used_by:** [[entities/endpoints/api-admin-site-settings]]
- **related:** [[entities/endpoints/api-newsletter-settings]]

## Sources

- `lib/branding/sync-newsletter-branding.ts` (lines 7–76)
