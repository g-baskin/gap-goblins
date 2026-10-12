---
type: entity
title: "upsert_contact_with_hierarchy_protection"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0011_crm_rpc_functions.sql"
language: sql
depends_on:
  - "[[entities/functions/contact-status-rank]]"
used_by:
  - "[[entities/functions/pushToCrm]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - database
  - crm
  - sql
related:
  - "[[concepts/crm-status-hierarchy]]"
  - "[[concepts/crm-pipeline-stage-promotion]]"
sources:
  - "lib/db/drizzle/0011_crm_rpc_functions.sql"
---

# upsert_contact_with_hierarchy_protection

## Overview

PL/pgSQL set-returning function that inserts or updates a contact row while preventing status downgrades (`lib/db/drizzle/0011_crm_rpc_functions.sql:17-162`). Called by [[entities/functions/pushToCrm]] (`lib/outreach/crm/push-to-crm.ts:38`). The hierarchy rule: if `contact_status_rank(existing_status) >= contact_status_rank(incoming_status)`, the existing status is kept.

## Signature

```sql
CREATE OR REPLACE FUNCTION upsert_contact_with_hierarchy_protection(
  p_email text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_contact_status text DEFAULT 'lead',
  p_source text DEFAULT 'unknown',
  p_original_source text DEFAULT NULL,
  -- ... UTM and attribution fields ...
  p_updated_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  contact_id uuid,
  created boolean,
  updated boolean,
  status_applied text
)
LANGUAGE plpgsql
```

## Behavior

1. Normalises email: `lower(trim(p_email))`; raises exception if blank (`lib/db/drizzle/0011_crm_rpc_functions.sql:49-52`).
2. Ranks incoming status via `contact_status_rank()` (`lib/db/drizzle/0011_crm_rpc_functions.sql:60`).
3. Looks up existing row in `contacts` by lower-cased email (`lib/db/drizzle/0011_crm_rpc_functions.sql:62`).
4. **INSERT path (not found):** inserts full row including all UTM attribution fields; returns `created: true, updated: false` (`lib/db/drizzle/0011_crm_rpc_functions.sql:64-122`).
5. **UPDATE path (found):** compares ranks; keeps higher of existing vs incoming status (`lib/db/drizzle/0011_crm_rpc_functions.sql:124-129`). Updates non-null fields only via `COALESCE`; returns `created: false, updated: true` (`lib/db/drizzle/0011_crm_rpc_functions.sql:131-161`).

## Connections

- **depends_on:** [[entities/functions/contact-status-rank]]
- **used_by:** [[entities/functions/pushToCrm]]
- **related:** [[concepts/crm-status-hierarchy]]

## Sources

- `lib/db/drizzle/0011_crm_rpc_functions.sql` (lines 17–162)
