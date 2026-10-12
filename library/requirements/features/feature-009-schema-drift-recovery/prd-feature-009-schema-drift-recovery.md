# Feature #009: Schema Drift Recovery

> **template-crm** — Feature PRD #009
>
> **Status:** Shipped
> **Priority:** P0
> **Effort:** M (3–8h)
> **Schema changes:** Additive (0013–0015)

---

## Phase Overview

### Goals

Repair Drizzle migration metadata and ship missing SQL so production PostgreSQL matches `lib/db/schema.ts`. The incident class: SQL files or schema changes existed on disk but were **not registered** in `meta/_journal.json` and/or lacked `meta/<n>_snapshot.json`, so `bun run db:migrate` skipped them and the app hit **column-not-found** at runtime (documented around `site_settings.sender_name`).

This PRD records work **already completed** in the codebase for traceability and onboarding.

### Scope

- Align `meta/_journal.json` with all SQL files under `lib/db/drizzle/`.
- Ensure latest journal entry has matching snapshot (`0015_snapshot.json`).
- Add migrations `0013_brand_onboarding`, `0014_invitation_and_auth_hardening`, `0015_webhook_event_dedup`.
- Add CI guard `bun run db:check` (`scripts/check-migration-drift.ts`).
- Document migrate-only policy (no production `db:push`).

### Out of scope

- Rewriting historical migrations before 0012.
- Automatic migrate on Railway deploy (still manual/`HANDOFF.md` procedure).

### Dependencies

- **Blocked by:** none
- **Blocks:** brand onboarding UI, unique admin emails, webhook idempotency
- **External:** Railway Postgres, GitHub Actions CI

---

## Confirmed drift (before fix)

| Symptom | Root cause |
|---|---|
| Runtime error: column `sender_name` (and related) missing on `site_settings` | Migration SQL not applied because journal did not list tag |
| Risk of duplicate migrations on next `db:generate` | Missing snapshot for last journal index |
| Operators tempted to `db:push` prod | Bypasses `__drizzle_migrations` tracking |

Reference: `.gg/commands/commit.md` three-artifact rule; `HANDOFF.md` §7 migrate-only warning.

---

## Execution sequence (completed)

1. **Audit** — List `lib/db/drizzle/*.sql` vs `meta/_journal.json` tags; identify gaps.
2. **Journal repair** — Register tags `0013_brand_onboarding`, `0014_invitation_and_auth_hardening`, `0015_webhook_event_dedup` in `_journal.json`.
3. **SQL** — Commit migration files:
   - `0013_brand_onboarding.sql` — `site_settings` brand/onboarding columns
   - `0014_invitation_and_auth_hardening.sql` — dedupe + unique `admin_users.email`
   - `0015_webhook_event_dedup.sql` — `webhook_event_dedup` table
4. **Snapshot** — Commit `meta/0015_snapshot.json` (and prior snapshots as required).
5. **Guard** — Ship `scripts/check-migration-drift.ts`; wire `db:check` in `package.json` and `.github/workflows/ci.yml`.
6. **Deploy** — Run `bun run db:migrate` against production `DATABASE_URL` after deploy.
7. **Document** — `library/knowledge-base/database/schema-and-migrations.md` (this library).

---

## Data model changes

| Migration | Change |
|---|---|
| 0013 | `site_settings`: `sender_name`, `primary_color`, `brand_imported_*`, `onboarding_complete` |
| 0014 | `admin_users.email` UNIQUE after dedupe |
| 0015 | New `webhook_event_dedup` (`source`, `event_id` unique) |

---

## Definition of done (verified)

- [x] All SQL files in `lib/db/drizzle/` have matching journal entries
- [x] Latest journal index has `meta/<idx>_snapshot.json`
- [x] `bun run db:check` passes locally and in CI
- [x] Production/staging migrated with `bun run db:migrate` (operator-run)
- [x] No production documentation recommends `db:push` without local-only guard
- [x] Knowledge-base doc: `library/knowledge-base/database/schema-and-migrations.md`

---

## Files touched (reference)

| Path | Role |
|---|---|
| `lib/db/drizzle/0013_brand_onboarding.sql` | Brand columns |
| `lib/db/drizzle/0014_invitation_and_auth_hardening.sql` | Admin email uniqueness |
| `lib/db/drizzle/0015_webhook_event_dedup.sql` | Webhook dedup table |
| `lib/db/drizzle/meta/_journal.json` | Journal |
| `lib/db/drizzle/meta/0015_snapshot.json` | Snapshot baseline |
| `scripts/check-migration-drift.ts` | Drift detector |
| `package.json` | `db:check` script |
| `.github/workflows/ci.yml` | CI step |
| `.gg/commands/commit.md` | Pre-commit migration checklist |

---

## Related docs

- [`library/knowledge-base/database/schema-and-migrations.md`](../../../knowledge-base/database/schema-and-migrations.md)
- [`HANDOFF.md`](../../../../HANDOFF.md) — production migrate procedure
- [`CLAUDE.md`](../../../../CLAUDE.md) — database patterns

---

## Changelog

- 2026-05 — Shipped; PRD written retroactively as feature #009 (feature #001 reserved for CRM pipeline).
