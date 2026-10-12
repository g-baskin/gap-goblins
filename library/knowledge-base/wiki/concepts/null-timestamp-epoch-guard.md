---
type: concept
title: "Null timestamp → Unix epoch → 1969 rendering bug"
status: mature
created: "2026-05-27"
updated: "2026-05-27"
tags:
  - concept
  - database
  - outreach
  - date
  - bug-pattern
related:
  - "[[entities/data-models/outreach-campaigns-table]]"
  - "[[entities/functions/formatDate]]"
sources:
  - "lib/db/schema.ts"
  - "lib/utils/format-date.ts"
  - "lib/db/drizzle/0009_outreach_timestamps_not_null.sql"
---

# Null timestamp → Unix epoch → 1969 rendering bug

## What it is

A class of bug where a nullable database timestamp column with no `DEFAULT now()` produces `NULL` on INSERT. When the raw `NULL` is serialised to JSON it becomes `null`. The UI calls `new Date(null)` to format it, which JavaScript coerces to `new Date(0)` — `1970-01-01T00:00:00.000Z`. In timezones west of UTC (e.g. UTC-4), subtracting the offset pushes the date back into 1969, so the browser displays **31 Dec 1969**.

## How it happened in this codebase

The `outreach_campaigns` table was created with nullable `created_at` / `updated_at` columns and no Postgres `DEFAULT`. The `createCampaign()` insert omitted both fields. Every campaign created from the admin UI stored `NULL` timestamps. The list page's local `formatDate` callback called `new Date(date)` without checking for null.

Affected tables before migration 0009:

| Table | Column | Was nullable? | Had DB default? |
|---|---|---|---|
| `outreach_campaigns` | `created_at` | YES | NO |
| `outreach_campaigns` | `updated_at` | YES | NO |
| `outreach_contacts` | `created_at` | YES | NO |

## The fix (migration 0009)

Expand-backfill-contract pattern applied in a single transaction:

```sql
-- EXPAND
ALTER TABLE outreach_campaigns ALTER COLUMN created_at SET DEFAULT now();
-- BACKFILL
UPDATE outreach_campaigns SET created_at = now() WHERE created_at IS NULL;
-- CONTRACT
ALTER TABLE outreach_campaigns ALTER COLUMN created_at SET NOT NULL;
```

Contacts backfill preferred the correlated `added_to_campaign_at` timestamp:

```sql
UPDATE outreach_contacts
  SET created_at = COALESCE(added_to_campaign_at, now())
  WHERE created_at IS NULL;
```

Drizzle schema updated to `.notNull().defaultNow()` to match.

## The UI guard (`formatDate`)

Even with the DB fixed, any column that is still nullable in TypeScript (`string | null`) can reach the formatter. The shared helper at `lib/utils/format-date.ts` defends all three failure modes:

```ts
if (!value) return "—";                              // null / undefined / ""
const date = value instanceof Date ? value : new Date(value);
if (Number.isNaN(date.getTime())) return "—";        // "invalid-date"
if (date.getFullYear() < 2000) return "—";           // epoch / pre-launch
```

The `< 2000` year check is the critical gate — it catches `new Date(null)` (→ 1970) and `new Date(0)` (→ 1970) without needing to check for specific epoch values.

## Prevention checklist

When adding a new timestamp column to any table:

- [ ] Add `SET DEFAULT now()` in the migration.
- [ ] Add `.notNull().defaultNow()` in the Drizzle schema.
- [ ] If the column can be null for business reasons, use `formatDate` (not raw `new Date()`) everywhere it renders.
- [ ] Add a `NOT NULL` probe to the QA checklist for that feature.

## References

- Migration: `lib/db/drizzle/0009_outreach_timestamps_not_null.sql`
- Helper: `lib/utils/format-date.ts`
- Tests: `lib/utils/__tests__/format-date.test.ts`
- IRD: `library/requirements/issues/completed/issue-001-outreach-campaign-null-timestamps/`
- QA report: `library/qa/outreach/2026-05-27-1969-date-fix.md`
- Locked rule: `library/knowledge-base/guides/locked-business-rules.md` §6
