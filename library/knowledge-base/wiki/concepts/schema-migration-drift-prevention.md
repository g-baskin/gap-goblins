---
type: concept
title: "Schema migration drift prevention"
complexity: intermediate
domain: database
aliases:
  - "drizzle journal drift"
  - "db:check"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - concept
  - database
  - ci
related:
  - "[[entities/checkMigrationDrift]]"
sources:
  - "scripts/check-migration-drift.ts"
---

# Schema migration drift prevention

## Definition

Three-artifact contract keeps Drizzle migrations deploy-safe: **SQL files**, **`meta/_journal.json` entries**, and **latest `meta/{idx}_snapshot.json`**. CI script [[entities/checkMigrationDrift]] fails the build when any artifact is missing or when deploy docs reference unguarded `db:push` (`scripts/check-migration-drift.ts:5-13`).

## How it works

```
Developer runs db:generate
    → produces .sql + journal entry + snapshot (must commit together)

CI runs bun scripts/check-migration-drift.ts
    → (1) every .sql registered in journal
    → (2) last journal idx has snapshot
    → (3) no db:push in deploy paths without "local only" comment

Production deploy runs db:migrate (not db:push)
```

**Failure mode prevented:** SQL file exists but no journal entry → migration skipped on deploy → column-not-found in production (`scripts/check-migration-drift.ts:42-45`).

**Failure mode prevented:** Missing latest snapshot → next `drizzle-kit generate` emits duplicate migration (`scripts/check-migration-drift.ts:60-65`).

## Why it matters

Railway deploys from git; untracked migration artifacts cause silent schema skew between environments.

## Examples in this codebase

- [[entities/checkMigrationDrift]] — enforcement script
- [[entities/migration-0013-brand-onboarding]] — example migration in journal
- [[entities/migration-0014-invitation-auth-hardening]] — dedup + unique index migration

## Connections

- **involves entities:** [[entities/checkMigrationDrift]]

## Sources

- `scripts/check-migration-drift.ts`
