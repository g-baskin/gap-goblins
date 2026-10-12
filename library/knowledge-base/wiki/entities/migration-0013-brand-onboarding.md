---
type: entity
title: "0013_brand_onboarding.sql"
entity_type: sql-table
status: stub
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/db/drizzle/0013_brand_onboarding.sql"
language: sql
source_extension: ".sql"
dialect: postgres
depends_on: []
used_by:
  - "[[entities/site-settings-sql-table]]"
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tags:
  - entity
  - migration
  - stub
sources:
  - "lib/db/drizzle/0013_brand_onboarding.sql"
---

# 0013_brand_onboarding.sql

## Overview

Drizzle migration adding brand onboarding columns to `site_settings` and backfilling `onboarding_complete` for existing rows (`lib/db/drizzle/0013_brand_onboarding.sql`).

## DDL summary

- `ALTER TABLE site_settings ADD` sender_name, primary_color, brand_imported_from, brand_imported_at, onboarding_complete
- `UPDATE` sets onboarding_complete=true where business_name or address_street present

## Connections

- **target table:** [[entities/site-settings-sql-table]]

## Sources

- `lib/db/drizzle/0013_brand_onboarding.sql`
