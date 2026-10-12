---
type: entity
title: "db (Drizzle PostgreSQL client)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/db/index.ts"
language: ts
depends_on:
  - "[[entities/env-vars/DATABASE_URL]]"
  - "[[entities/data-models/schema-module]]"
used_by:
  - "[[entities/modules/auth]]"
  - "[[entities/functions/pushToCrm]]"
  - "[[entities/modules/crm-contacts]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - database
related:
  - "[[comparisons/drizzle-vs-supabase-client]]"
sources:
  - "lib/db/index.ts"
---

# db (Drizzle PostgreSQL client)

## Overview

Lazy-initialized Drizzle ORM client over `postgres.js`. Uses a Proxy so the module loads at build time without `DATABASE_URL`, throwing only on first actual DB access (`lib/db/index.ts:49-64`).

## Signature / Definition

```ts
export const db: Database = new Proxy({} as Database, { get(...) { ... } });
export type DB = typeof db;
```

## Behavior

- Connection pool cached in dev via `globalForDb` to survive HMR (`lib/db/index.ts:14-17`, `lib/db/index.ts:44`).
- Pool options: `prepare: false`, `max: 10`, statement timeout 15s (`lib/db/index.ts:34-42`).
- Throws descriptive error if `DATABASE_URL` missing at runtime (`lib/db/index.ts:20-29`).

## Connections

- **depends_on:** [[entities/env-vars/DATABASE_URL]]
- **related:** [[comparisons/drizzle-vs-supabase-client]]

## History

- **Last touched:** `40438e4` (2026-05-27)

## Sources

- `lib/db/index.ts` (lines 1–67)
