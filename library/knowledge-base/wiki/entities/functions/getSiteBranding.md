---
type: entity
title: "getSiteBranding"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/branding/get-site-branding.ts"
language: ts
depends_on:
  - "[[entities/functions/formatPostalAddress]]"
  - "[[entities/siteSettings-data-model]]"
used_by: []
last_commit_hash: "91aec3d"
tested_by: []
tags:
  - entity
  - branding
related:
  - "[[entities/syncNewsletterBranding]]"
sources:
  - "lib/branding/get-site-branding.ts"
---

# getSiteBranding

## Overview

Server-only async function that reads the singleton `site_settings` row (`id = 'default'`) and returns a typed `SiteBranding` struct with fallback defaults (`lib/branding/get-site-branding.ts:25-48`). Safe to call even when no row exists — returns `makeFallback()` on either missing row or DB error.

## Signature

```ts
export async function getSiteBranding(): Promise<SiteBranding>

export type SiteBranding = {
  businessName: string;
  senderName: string;
  logoUrl: string | null;
  primaryColor: string;
  website: string | null;
  physicalAddress: string | null;
  contactEmail: string | null;
  onboardingComplete: boolean;
};
```

## Behavior

1. Queries `siteSettings` for `id = 'default'` via `db.select().where(eq(...)).limit(1)` (`lib/branding/get-site-branding.ts:27-31`).
2. If no row → returns `makeFallback()` with `__YOUR_BRAND__` defaults (`lib/branding/get-site-branding.ts:33`).
3. Maps `row.businessName`, `row.senderName ?? row.businessName`, `row.logoUrl`, `row.primaryColor`, `row.website`, `row.email` (`lib/branding/get-site-branding.ts:35-44`).
4. Builds `physicalAddress` by calling `formatPostalAddress(row)` (`lib/branding/get-site-branding.ts:41`).
5. Wraps entire body in `try/catch` — any DB exception returns `makeFallback()` (`lib/branding/get-site-branding.ts:45-47`).

## Fallback defaults

```ts
const DEFAULTS = {
  businessName: "__YOUR_BRAND__",
  senderName: "__YOUR_BRAND__",
  primaryColor: "#3B82F6",
} as const;
```

## Connections

- **depends_on:** [[entities/functions/formatPostalAddress]], [[entities/siteSettings-data-model]]

## Sources

- `lib/branding/get-site-branding.ts` (lines 8–61)
