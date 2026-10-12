---
type: entity
title: "webhook_event_dedup (SQL table)"
entity_type: sql-table
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0015_webhook_event_dedup.sql"
language: sql
dialect: postgres
columns:
  - id
  - source
  - event_id
  - created_at
primary_key: id
data_model: "[[entities/webhookEventDedup-data-model]]"
depends_on: []
used_by:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - database
  - webhooks
related:
  - "[[concepts/cal-com-webhook-idempotency]]"
sources:
  - "lib/db/drizzle/0015_webhook_event_dedup.sql"
  - "lib/db/schema.ts"
---

# webhook_event_dedup (SQL table)

## Overview

Idempotency ledger for inbound webhooks. Unique on `(source, event_id)` prevents duplicate side effects from provider retries (`lib/db/drizzle/0015_webhook_event_dedup.sql:8-9`, `app/api/webhooks/cal/route.ts:507-525`).

## DDL

```sql
CREATE TABLE webhook_event_dedup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX webhook_event_dedup_source_event_unique_idx
  ON webhook_event_dedup (source, event_id);
```

(`lib/db/drizzle/0015_webhook_event_dedup.sql:1-9`)

## Columns

| Column | Type | Notes |
|--------|------|-------|
| source | text | e.g. `'cal'` (`app/api/webhooks/cal/route.ts:513`) |
| event_id | text | Composite key `{EVENT}:{bookingUid}` (`app/api/webhooks/cal/route.ts:509`) |

## Connections

- **used_by:** [[entities/endpoints/post-api-webhooks-cal]]
- **concept:** [[concepts/cal-com-webhook-idempotency]]

## Sources

- `lib/db/drizzle/0015_webhook_event_dedup.sql`
- `lib/db/schema.ts` (lines 116–131)
