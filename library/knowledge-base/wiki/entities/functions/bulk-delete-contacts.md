---
type: entity
title: "bulk_delete_contacts"
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

# bulk_delete_contacts

## Overview

PL/pgSQL void function that cascades-deletes a set of contacts and all their dependent rows in the correct order to satisfy foreign-key constraints (`lib/db/drizzle/0011_crm_rpc_functions.sql:286-298`).

## Signature

```sql
CREATE OR REPLACE FUNCTION bulk_delete_contacts(p_contact_ids uuid[])
RETURNS void
LANGUAGE plpgsql
```

## Behavior

Deletion order (mandatory to satisfy FK constraints):

1. `deal_stage_history` where `deal_id IN (SELECT id FROM deals WHERE contact_id = ANY(p_contact_ids))` (`lib/db/drizzle/0011_crm_rpc_functions.sql:291-293`).
2. `deals` where `contact_id = ANY(p_contact_ids)` (`lib/db/drizzle/0011_crm_rpc_functions.sql:295`).
3. `contact_timeline` where `contact_id = ANY(p_contact_ids)` (`lib/db/drizzle/0011_crm_rpc_functions.sql:296`).
4. `contacts` where `id = ANY(p_contact_ids)` (`lib/db/drizzle/0011_crm_rpc_functions.sql:297`).

## Connections

- No known TypeScript callers in current scan — see gaps.

## Sources

- `lib/db/drizzle/0011_crm_rpc_functions.sql` (lines 286–298)
