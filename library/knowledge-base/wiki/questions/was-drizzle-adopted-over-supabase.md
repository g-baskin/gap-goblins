---
type: question
title: "Was Drizzle adoption over Supabase client an ADR?"
question: "Did any commit encode a formal decision to replace @supabase/supabase-js queries with Drizzle ORM?"
answer_quality: draft
created: "2026-05-27"
updated: "2026-05-27"
status: seed
tags:
  - question
  - database
related:
  - "[[comparisons/drizzle-vs-supabase-client]]"
  - "[[entities/modules/db-client]]"
sources:
  - "CLAUDE.md"
---

# Was Drizzle adoption over Supabase client an ADR?

## Question

CLAUDE.md states `@supabase/supabase-js` is no longer used for database queries and all access goes through `db` from `@/lib/db`. No Tier-1 commit message matching `migrate from X to Y` was found in recent git history for this change.

## Evidence found

- `lib/db/index.ts` — Drizzle + postgres.js client (`lib/db/index.ts:1-64`)
- CLAUDE.md Anti-patterns: "Using supabaseAdmin() for database queries" forbidden
- Initial commit `7d71822` may contain original stack choice — not re-scanned in this pass

## Proposed resolution

Human review: if initial commit or an older branch documents Supabase → Drizzle migration, promote to ADR `drizzle-over-supabase-client`. Otherwise treat as template baseline, not a recorded decision.

## Connections

- [[comparisons/drizzle-vs-supabase-client]]
