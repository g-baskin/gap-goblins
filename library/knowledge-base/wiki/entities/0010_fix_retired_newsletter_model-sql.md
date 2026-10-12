---
type: entity
title: "0010_fix_retired_newsletter_model.sql"
entity_type: sql-table
status: stub
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0010_fix_retired_newsletter_model.sql"
language: sql
depends_on: []
used_by: []
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - migration
  - stub
related:
  - "[[entities/functions/resolveNewsletterAnthropicModel]]"
  - "[[concepts/newsletter-model-resolution]]"
sources:
  - "lib/db/drizzle/0010_fix_retired_newsletter_model.sql"
partial_scan: true
---

# 0010_fix_retired_newsletter_model.sql

## Overview

One-time Drizzle migration that back-fills the `newsletter_campaigns.summarizer_model` column. When the schema default was changed from `'claude-3-5-sonnet-20241022'` to `'claude-sonnet-4-6'`, any campaign rows created before the migration still held the retired model ID. This UPDATE remaps them to the current default so `resolveNewsletterAnthropicModel` no longer needs to hit the retired-model guard branch at runtime for those rows.

## SQL

```sql
UPDATE newsletter_campaigns
SET    summarizer_model = 'claude-sonnet-4-6'
WHERE  summarizer_model = 'claude-3-5-sonnet-20241022';
```

(`lib/db/drizzle/0010_fix_retired_newsletter_model.sql:1–6`)

## Behavior

- Targets `newsletter_campaigns` table.
- Conditional — no-op if no rows match the WHERE clause.
- Non-destructive — only updates `summarizer_model`; no data is deleted.
- Idempotent on re-run.

## Connections

- **related:** [[entities/functions/resolveNewsletterAnthropicModel]] (runtime guard that also remaps this value), [[concepts/newsletter-model-resolution]]

## History

- **Created:** commit `40438e4` — accompanies `anthropic-model.ts` extraction (this session)

## Sources

- `lib/db/drizzle/0010_fix_retired_newsletter_model.sql` (lines 1–6)
