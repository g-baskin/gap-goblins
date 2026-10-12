---
type: entity
title: "checkMigrationDrift"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "scripts/check-migration-drift.ts"
language: ts
depends_on: []
used_by: []
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - database
  - ci
related:
  - "[[concepts/schema-migration-drift-prevention]]"
sources:
  - "scripts/check-migration-drift.ts"
---

# checkMigrationDrift

## Overview

CLI script (`bun scripts/check-migration-drift.ts`) that exits non-zero when Drizzle migration artifacts drift from deploy expectations (`scripts/check-migration-drift.ts:1-14`).

## Behavior

Three checks:

1. **Journal coverage** — every `lib/db/drizzle/*.sql` must appear in `meta/_journal.json` (`scripts/check-migration-drift.ts:38-50`).
2. **Latest snapshot** — last journal entry must have matching `meta/{idx}_snapshot.json` (`scripts/check-migration-drift.ts:52-68`).
3. **No unguarded `db:push`** — scans CI/Docker/docs for `db:push` without local-only context (`scripts/check-migration-drift.ts:70-106`).

Fix hint on failure: run `bun run db:generate` and commit SQL + journal + snapshot together (`scripts/check-migration-drift.ts:116-118`).

## Connections

- **concept:** [[concepts/schema-migration-drift-prevention]]

## Sources

- `scripts/check-migration-drift.ts` (lines 1–122)
