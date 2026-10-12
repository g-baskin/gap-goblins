---
type: entity
title: "DATABASE_URL"
entity_type: env-var
status: mature
created: "2026-05-27"
updated: "2026-05-27"
name: DATABASE_URL
path: "lib/db/index.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/modules/db-client]]"
  - "[[entities/modules/worker-process]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - env-var
sources:
  - "lib/db/index.ts"
  - "scripts/worker.ts"
---

# DATABASE_URL

## Overview

PostgreSQL connection string for Drizzle ORM and pg-boss worker. Required at runtime when DB is accessed; worker exits immediately if unset (`lib/db/index.ts:20-29`, `scripts/worker.ts:60-64`).

## Read sites

- `lib/db/index.ts:20` — `createDb()` connection string
- `scripts/worker.ts:60` — worker bootstrap

## Default value

None — throws with troubleshooting steps if missing (`lib/db/index.ts:22-28`).

## Connections

- **used_by:** [[entities/modules/db-client]], [[entities/modules/worker-process]]

## Sources

- `lib/db/index.ts` (lines 20–29)
- `scripts/worker.ts` (lines 60–64)
