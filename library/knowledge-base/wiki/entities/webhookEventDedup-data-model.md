---
type: entity
title: "webhookEventDedup (Drizzle model)"
entity_type: data-model
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/schema.ts"
language: ts
schema_library: drizzle
fields:
  - id
  - source
  - eventId
  - createdAt
depends_on: []
used_by:
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - database
related:
  - "[[entities/webhook-event-dedup-sql-table]]"
sources:
  - "lib/db/schema.ts"
---

# webhookEventDedup (Drizzle model)

## Overview

Drizzle model for webhook deduplication rows. Composite unique index on `source` + `eventId` (`lib/db/schema.ts:118-131`).

## Schema definition

```ts
export const webhookEventDedup = pgTable("webhook_event_dedup", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  eventId: text("event_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("webhook_event_dedup_source_event_unique_idx")
    .on(table.source, table.eventId),
]);
```

## Connections

- **sql-table pair:** [[entities/webhook-event-dedup-sql-table]]
- **concept:** [[concepts/cal-com-webhook-idempotency]]

## Sources

- `lib/db/schema.ts` (lines 116–131)
