---
type: entity
title: "formatPostalAddress"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/branding/format-postal-address.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/syncNewsletterBranding]]"
  - "[[entities/functions/getSiteBranding]]"
last_commit_hash: "91aec3d"
tested_by: []
tags:
  - entity
  - branding
  - formatting
related: []
sources:
  - "lib/branding/format-postal-address.ts"
---

# formatPostalAddress

## Overview

Pure synchronous utility that joins optional address-field strings into a single comma-separated line suitable for email footers (`lib/branding/format-postal-address.ts:13-30`). Returns `null` when all fields are absent or blank — callers treat `null` as "no address".

## Signature

```ts
type AddressFields = {
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostcode?: string | null;
  addressCountry?: string | null;
};

export function formatPostalAddress(fields: AddressFields): string | null
```

## Behavior

1. Starts with an empty `parts: string[]` array (`lib/branding/format-postal-address.ts:14`).
2. Appends `addressStreet` (trimmed) if truthy (`lib/branding/format-postal-address.ts:16`).
3. Builds city-line by joining `addressCity`, `addressState`, `addressPostcode` with single space, filtering falsy values (`lib/branding/format-postal-address.ts:18-24`); appends if non-empty.
4. Appends `addressCountry` (trimmed) if truthy (`lib/branding/format-postal-address.ts:27`).
5. Returns `parts.join(", ")` or `null` if `parts` is empty (`lib/branding/format-postal-address.ts:29`).

## Connections

- **used_by:** [[entities/syncNewsletterBranding]], [[entities/functions/getSiteBranding]]

## Sources

- `lib/branding/format-postal-address.ts` (lines 1–30)
