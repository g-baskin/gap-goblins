---
type: entity
title: "DATABASE_URL"
entity_type: env-var
status: developing
created: "2026-05-28"
updated: "2026-05-28"
name: DATABASE_URL
path: "scripts/worker.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/worker-pg-boss]]"
  - "[[entities/QUEUE-pg-boss]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - env
  - database
sources:
  - "scripts/worker.ts"
---

# DATABASE_URL

## Overview

PostgreSQL connection string for Drizzle ORM and pg-boss. Same database hosts application tables and the `pgboss` schema (`scripts/worker.ts:54-58`).

## Read sites

- `scripts/worker.ts:54` — worker exits if unset
- Used throughout `@/lib/db` (server-only Drizzle client)

## Connections

- **used_by:** [[entities/worker-pg-boss]], all API routes using `db`

## Sources

- `scripts/worker.ts` (lines 54–64)
