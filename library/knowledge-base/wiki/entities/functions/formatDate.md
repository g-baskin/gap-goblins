---
type: entity
title: "formatDate"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/utils/format-date.ts"
language: ts
signature: "formatDate(value: string | Date | null | undefined, locale?: string, options?: Intl.DateTimeFormatOptions): string"
depends_on: []
used_by:
  - "[[entities/pages/outreach-campaigns-page]]"
  - "app/admin/(dashboard)/outreach/campaigns/page.tsx"
  - "app/admin/(dashboard)/outreach/blocklist/page.tsx"
tested_by:
  - "lib/utils/__tests__/format-date.test.ts"
tags:
  - entity
  - utility
  - date
  - outreach
related:
  - "[[concepts/null-timestamp-epoch-guard]]"
sources:
  - "lib/utils/format-date.ts"
---

# formatDate

## Overview

Shared date-formatting utility at `lib/utils/format-date.ts`. Accepts a raw string, `Date` object, `null`, or `undefined` and returns a localized date string, or `—` (em dash) if the input is absent, unparseable, or represents a date before the year 2000. The pre-2000 guard specifically catches Unix-epoch coercion (`new Date(null)` → 1970-01-01) that previously rendered as "31 Dec 1969" in the outreach campaigns list.

## Signature

```ts
export function formatDate(
  value: string | Date | null | undefined,
  locale = "en-AU",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string
```

## Behaviour

| Input | Output |
|---|---|
| `null` | `—` |
| `undefined` | `—` |
| `""` | `—` |
| `"invalid-date"` | `—` |
| `new Date(0).toISOString()` (epoch) | `—` |
| Valid ISO string | Formatted locale string |
| `Date` object (valid, post-2000) | Formatted locale string |

## Usage

```ts
import { formatDate } from "@/lib/utils/format-date";

// basic — uses en-AU defaults
formatDate(campaign.created_at)
// → "28 May 2026" or "—"

// with custom options (e.g. blocklist — include time)
formatDate(entry.created_at, "en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
```

## Connections

- **concept:** [[concepts/null-timestamp-epoch-guard]] — full explanation of the epoch bug and why the pre-2000 guard exists
- **locked rule:** `library/knowledge-base/guides/locked-business-rules.md` §6 — mandates this helper for all admin date rendering

## Sources

- `lib/utils/format-date.ts`
- `lib/utils/__tests__/format-date.test.ts`
