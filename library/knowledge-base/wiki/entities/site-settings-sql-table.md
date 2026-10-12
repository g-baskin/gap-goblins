---
type: entity
title: "site_settings (SQL table)"
entity_type: sql-table
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/schema.ts"
language: ts
dialect: postgres
columns:
  - id
  - business_name
  - sender_name
  - primary_color
  - brand_imported_from
  - brand_imported_at
  - onboarding_complete
primary_key: id
data_model: "[[entities/siteSettings-data-model]]"
depends_on: []
used_by:
  - "[[entities/endpoints/api-admin-site-settings]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - database
  - branding
related:
  - "[[concepts/schema-migration-drift-prevention]]"
sources:
  - "lib/db/schema.ts"
  - "lib/db/drizzle/0013_brand_onboarding.sql"
---

# site_settings (SQL table)

## Overview

Singleton-style table holding business identity and brand onboarding state for the admin CRM. Row `id = 'default'` is the only row read/written by `app/api/admin/site-settings/route.ts` (`app/api/admin/site-settings/route.ts:19`, `app/api/admin/site-settings/route.ts:40`).

## DDL

Migration `0013_brand_onboarding.sql` adds brand columns (`lib/db/drizzle/0013_brand_onboarding.sql:1-5`):

- `sender_name`, `primary_color`, `brand_imported_from`, `brand_imported_at`
- `onboarding_complete boolean NOT NULL DEFAULT false`

Backfill marks existing installs onboarded when `business_name` or `address_street` is set (`lib/db/drizzle/0013_brand_onboarding.sql:8-11`).

## Columns

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | Default `'default'` (`lib/db/schema.ts:1137`) |
| business_name | text | |
| sender_name | text | Brand onboarding (`lib/db/schema.ts:1150`) |
| primary_color | text | |
| brand_imported_from | text | Source URL/domain of import |
| brand_imported_at | timestamptz | |
| onboarding_complete | boolean NOT NULL | Gates first-run UX (`lib/db/schema.ts:1154`) |

## Connections

- **data_model:** [[entities/siteSettings-data-model]]
- **used_by:** [[entities/endpoints/api-admin-site-settings]]

## Sources

- `lib/db/schema.ts` (lines 1134–1157)
- `lib/db/drizzle/0013_brand_onboarding.sql`
