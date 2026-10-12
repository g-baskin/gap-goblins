---
type: entity
title: "bulk_add_tags"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0011_crm_rpc_functions.sql"
language: sql
depends_on: []
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - database
  - crm
  - sql
related: []
sources:
  - "lib/db/drizzle/0011_crm_rpc_functions.sql"
---

# bulk_add_tags

## Overview

PL/pgSQL function that appends tags to multiple contacts at once, deduplicating the combined array (`lib/db/drizzle/0011_crm_rpc_functions.sql:261-283`). Returns the count of rows updated. Does not remove existing tags — additive only.

## Signature

```sql
CREATE OR REPLACE FUNCTION bulk_add_tags(
  p_contact_ids uuid[],
  p_tags text[]
)
RETURNS integer
LANGUAGE plpgsql
```

## Behavior

1. Updates `contacts.tags` for all rows where `id = ANY(p_contact_ids)` (`lib/db/drizzle/0011_crm_rpc_functions.sql:271-279`).
2. New tags value = `array_agg(DISTINCT t)` over the union of existing and incoming tags, filtering null/blank entries.
3. Gets row count via `GET DIAGNOSTICS v_count = ROW_COUNT` and returns it (`lib/db/drizzle/0011_crm_rpc_functions.sql:281-282`).

## Connections

- No known TypeScript callers in current scan — see gaps.

## Sources

- `lib/db/drizzle/0011_crm_rpc_functions.sql` (lines 261–283)
