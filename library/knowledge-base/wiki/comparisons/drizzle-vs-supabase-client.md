---
type: comparison
title: "Drizzle ORM vs Supabase JS client"
subjects:
  - "[[entities/modules/db-client]]"
dimensions:
  - "query API"
  - "RLS bypass for auth"
  - "RPC support"
verdict: "Drizzle via postgres.js for all app queries; Supabase client deprecated for DB access. RPC functions still invoked via db.execute(sql`...`)."
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - comparison
  - database
related:
  - "[[questions/was-drizzle-adopted-over-supabase]]"
sources:
  - "CLAUDE.md"
  - "lib/db/index.ts"
---

# Drizzle ORM vs Supabase JS client

## Context

CRM originally targeted Supabase-hosted Postgres; deployment now uses Railway Postgres with Drizzle ORM (CLAUDE.md Tech Stack).

## Drizzle (current)

- `db` from `@/lib/db` — lazy Proxy over Drizzle + postgres.js (`lib/db/index.ts:55-64`)
- camelCase schema in `lib/db/schema.ts`; map to snake_case for API responses (CLAUDE.md)
- RPC: `db.execute(sql`...`)` with named params (`push-to-crm.ts:37-46`)

## Supabase client (deprecated for queries)

- CLAUDE.md: `@supabase/supabase-js` no longer used for database queries
- Anti-pattern: `supabaseAdmin()` / `getSupabaseClient()` for queries

## Verdict

Postgres access is Drizzle-only in application code. Supabase remains a historical host reference only.

## Sources

- `CLAUDE.md` (Database Client, Anti-patterns sections)
- `lib/db/index.ts`
