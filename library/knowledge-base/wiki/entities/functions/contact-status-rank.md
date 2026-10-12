---
type: entity
title: "contact_status_rank"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0011_crm_rpc_functions.sql"
language: sql
depends_on: []
used_by:
  - "[[entities/functions/upsert-contact-with-hierarchy-protection]]"
  - "[[entities/functions/update-contact-and-deal-for-booking]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - database
  - crm
  - sql
related:
  - "[[concepts/crm-status-hierarchy]]"
sources:
  - "lib/db/drizzle/0011_crm_rpc_functions.sql"
---

# contact_status_rank

## Overview

Immutable SQL helper function that converts a contact-status text value into an integer rank for comparison (`lib/db/drizzle/0011_crm_rpc_functions.sql:3-15`). Used by hierarchy-protection RPCs to prevent status downgrades.

## Signature

```sql
CREATE OR REPLACE FUNCTION contact_status_rank(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
```

## Behavior

Returns a fixed rank integer per status:

| Status | Rank |
|--------|------|
| `subscriber` | 0 |
| `lead` | 1 |
| `qualified` | 2 |
| `customer` | 3 |
| (unknown) | 0 |

Declared `IMMUTABLE` — safe for use as an index expression (`lib/db/drizzle/0011_crm_rpc_functions.sql:6`).

## Connections

- **used_by:** [[entities/functions/upsert-contact-with-hierarchy-protection]], [[entities/functions/update-contact-and-deal-for-booking]]
- **related:** [[concepts/crm-status-hierarchy]]

## Sources

- `lib/db/drizzle/0011_crm_rpc_functions.sql` (lines 3–15)
