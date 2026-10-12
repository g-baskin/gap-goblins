---
type: entity
title: "contacts (sql table)"
entity_type: sql-table
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/db/schema.ts"
language: ts
dialect: postgres
columns:
  - id
  - email
  - contactStatus
  - firstName
  - lastName
  - company
data_model: "[[entities/data-models/contacts-table]]"
primary_key: id
depends_on: []
used_by:
  - "[[entities/modules/crm-contacts]]"
  - "[[entities/functions/pushToCrm]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - database
  - crm
related:
  - "[[concepts/crm-status-hierarchy]]"
sources:
  - "lib/db/schema.ts"
---

# contacts (sql table)

## Overview

PostgreSQL `contacts` table defined in Drizzle schema with UUID primary key, required email, and `contact_status` hierarchy field (`lib/db/schema.ts:259-284`).

## Columns (selected)

| Column (Drizzle) | SQL | Notes |
|---|---|---|
| id | id | UUID PK, default random |
| email | email | NOT NULL |
| contactStatus | contact_status | subscriber/lead/qualified/customer |
| firstName | first_name | |
| lastName | last_name | |
| company | company | |

## Connections

- **data-model pair:** same shape in Drizzle `pgTable` definition
- **RPC:** `upsert_contact_with_hierarchy_protection` (CLAUDE.md)
- **concept:** [[concepts/crm-status-hierarchy]]

## Sources

- `lib/db/schema.ts` (lines 259–328)
