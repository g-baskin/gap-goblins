---
type: entity
title: "siteSettings (Drizzle model)"
entity_type: data-model
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/schema.ts"
language: ts
schema_library: drizzle
fields:
  - id
  - businessName
  - senderName
  - primaryColor
  - brandImportedFrom
  - brandImportedAt
  - onboardingComplete
depends_on: []
used_by:
  - "[[entities/endpoints/api-admin-site-settings]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - database
related:
  - "[[entities/site-settings-sql-table]]"
sources:
  - "lib/db/schema.ts"
---

# siteSettings (Drizzle model)

## Overview

Drizzle `pgTable` mapping for `site_settings`. CamelCase TS fields map to snake_case DB columns (`lib/db/schema.ts:1136-1157`).

## Schema definition

```ts
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  businessName: text("business_name"),
  // ... address fields ...
  senderName: text("sender_name"),
  primaryColor: text("primary_color"),
  brandImportedFrom: text("brand_imported_from"),
  brandImportedAt: timestamp("brand_imported_at", { withTimezone: true, mode: "string" }),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
});
```

## Connections

- **sql-table pair:** [[entities/site-settings-sql-table]]
- **used_by:** [[entities/endpoints/api-admin-site-settings]]

## Sources

- `lib/db/schema.ts` (lines 1134–1157)
