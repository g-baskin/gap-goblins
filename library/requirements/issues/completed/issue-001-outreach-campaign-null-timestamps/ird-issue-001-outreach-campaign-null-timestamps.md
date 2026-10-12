# Issue #001: outreach_campaigns created_at renders as 31 Dec 1969

> **Internal bug — no GitHub issue**
> **Reported:** 2026-05-27 (discovered in admin UI at `/admin/outreach/campaigns`)
> **Fixed:** 2026-05-27
> **Status:** Completed

---

## Overview

Newly created campaigns displayed "31 Dec 1969" in the Created column of the outreach campaigns list. The bug was present from the first campaign insert — any campaign created from the UI had a null `created_at` value, which the page's date formatter coerced to the Unix epoch (1970-01-01T00:00:00Z), rendering as 31 Dec 1969 in UTC-4.

---

## Root cause

Three compounding failures:

1. **Schema**: `outreach_campaigns.created_at` and `outreach_campaigns.updated_at` were declared nullable in the Drizzle schema with no `DEFAULT now()` — so the Postgres column had no default either.
2. **Insert**: `createCampaign()` in `lib/outreach/campaigns/actions.ts` never set `createdAt`, relying on a default that did not exist. Every campaign INSERT produced `NULL` in both timestamp columns.
3. **UI**: `formatDate` in `app/admin/(dashboard)/outreach/campaigns/page.tsx` called `new Date(date)` with no null guard. `new Date(null)` returns `1970-01-01T00:00:00.000Z`, which in UTC-4 renders as 31 Dec 1969.

The same schema gap existed on `outreach_contacts.created_at`.

---

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-1 | New campaigns have a populated `created_at` / `updated_at` within 1 s of INSERT |
| AC-2 | Pre-existing rows with `NULL` timestamps are backfilled |
| AC-3 | UI shows `—` for any row that still carries a null, invalid, or pre-2000 date |
| AC-4 | TypeScript type for `created_at` is `string \| null` across all pages that consume it |
| AC-5 | Zero `NULL` `created_at` rows remain in `outreach_campaigns` or `outreach_contacts` post-migration |

---

## Proposed solution

Expand-backfill-contract migration on the three affected columns, Drizzle schema sync, shared safe-formatting helper.

---

## Implementation plan (completed)

1. **Pre-flight** — confirmed 1 campaign with `NULL` timestamps; columns had no DB default.
2. **Migration** — authored `lib/db/drizzle/0009_outreach_timestamps_not_null.sql`:
   - EXPAND: `ALTER COLUMN ... SET DEFAULT now()` on all three columns.
   - BACKFILL: `UPDATE ... WHERE created_at IS NULL` (contacts prefer `added_to_campaign_at`).
   - CONTRACT: `ALTER COLUMN ... SET NOT NULL`.
   - Registered in `lib/db/drizzle/meta/_journal.json` as idx 9.
   - Applied with `bun run db:migrate`.
3. **Schema** — added `.notNull().defaultNow()` to `outreachCampaigns.createdAt`, `outreachCampaigns.updatedAt`, `outreachContacts.createdAt` in `lib/db/schema.ts`.
4. **Shared helper** — created `lib/utils/format-date.ts`: returns `—` for null/undefined/invalid/pre-2000.
5. **UI sweep** — replaced local `formatDate` callbacks in:
   - `app/admin/(dashboard)/outreach/campaigns/page.tsx`
   - `app/admin/(dashboard)/outreach/blocklist/page.tsx`
   - Widened `created_at: string | null` in page-level Campaign interfaces.
6. **Unit tests** — `lib/utils/__tests__/format-date.test.ts` — 6 cases, all pass.

---

## Files touched

| File | Change |
|---|---|
| `lib/db/drizzle/0009_outreach_timestamps_not_null.sql` | New migration |
| `lib/db/drizzle/meta/_journal.json` | Registered migration idx 9 |
| `lib/db/schema.ts` | `.notNull().defaultNow()` on 3 columns |
| `lib/utils/format-date.ts` | New shared helper |
| `lib/utils/__tests__/format-date.test.ts` | New unit tests |
| `app/admin/(dashboard)/outreach/campaigns/page.tsx` | Use shared helper; widen type |
| `app/admin/(dashboard)/outreach/blocklist/page.tsx` | Use shared helper; widen type |
| `app/admin/(dashboard)/outreach/campaigns/[id]/page.tsx` | Widen type only |

---

## Out of scope

- `outreach_contacts.updated_at` — still nullable; no UI renders it as a date display (separate ticket if needed).
- RPC `increment_campaign_stats` does not bump `updated_at` — flagged but not in scope here.
- Contact list date rendering outside the outreach module.

---

## Related

- QA report: [`library/qa/outreach/2026-05-27-1969-date-fix.md`](../../../../qa/outreach/2026-05-27-1969-date-fix.md)
- Wiki concept: [`library/knowledge-base/wiki/concepts/null-timestamp-epoch-guard.md`](../../../knowledge-base/wiki/concepts/null-timestamp-epoch-guard.md)
- Locked rule: [`library/knowledge-base/guides/locked-business-rules.md`](../../../knowledge-base/guides/locked-business-rules.md) §6
