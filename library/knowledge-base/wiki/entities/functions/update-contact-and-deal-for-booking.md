---
type: entity
title: "update_contact_and_deal_for_booking"
entity_type: function
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0011_crm_rpc_functions.sql"
language: sql
depends_on:
  - "[[entities/functions/contact-status-rank]]"
used_by:
  - "[[entities/runCrmBookingSync]]"
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - database
  - crm
  - sql
  - calendar
related:
  - "[[concepts/crm-pipeline-stage-promotion]]"
  - "[[concepts/deal-stage-promotion-rules]]"
sources:
  - "lib/db/drizzle/0011_crm_rpc_functions.sql"
---

# update_contact_and_deal_for_booking

## Overview

PL/pgSQL set-returning function that atomically upgrades a contact to `qualified` and advances the contact's open deal to a target pipeline stage when a Cal.com booking is received (`lib/db/drizzle/0011_crm_rpc_functions.sql:164-259`). Called from `app/api/webhooks/cal/route.ts:194`.

## Signature

```sql
CREATE OR REPLACE FUNCTION update_contact_and_deal_for_booking(
  p_contact_id uuid,
  p_stage_id uuid,
  p_booking_id text,
  p_now timestamptz
)
RETURNS TABLE (
  contact_updated boolean,
  deal_id uuid,
  deal_updated boolean,
  history_created boolean
)
LANGUAGE plpgsql
```

## Behavior

1. Selects contact by `p_contact_id`; returns all-false if not found (`lib/db/drizzle/0011_crm_rpc_functions.sql:186-194`).
2. Upgrades contact to `qualified` only if rank is currently below `qualified` (`lib/db/drizzle/0011_crm_rpc_functions.sql:196-207`).
3. Finds most-recently-updated open deal for the contact (`lib/db/drizzle/0011_crm_rpc_functions.sql:209-214`).
4. If found and stage differs from `p_stage_id`: inserts a `deal_stage_history` row with `trigger_source: 'cal_booking', automated: true` (`lib/db/drizzle/0011_crm_rpc_functions.sql:216-232`), then updates deal's `stage_id`, `stage_entered_at`, `meeting_booked_at` (`lib/db/drizzle/0011_crm_rpc_functions.sql:233-241`).
5. Returns boolean flags for each side-effect: `contact_updated`, `deal_updated`, `history_created` (`lib/db/drizzle/0011_crm_rpc_functions.sql:254-258`).

## Connections

- **depends_on:** [[entities/functions/contact-status-rank]]
- **used_by:** [[entities/runCrmBookingSync]], [[entities/endpoints/post-api-webhooks-cal]]
- **related:** [[concepts/crm-pipeline-stage-promotion]], [[concepts/deal-stage-promotion-rules]]

## Sources

- `lib/db/drizzle/0011_crm_rpc_functions.sql` (lines 164–259)
