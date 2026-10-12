---
type: entity
title: "outreach_campaigns (sql table)"
entity_type: sql-table
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/db/schema.ts"
language: ts
dialect: postgres
columns:
  - id
  - name
  - status
  - fromEmail
  - fromName
  - createdAt
  - updatedAt
  - testMode
  - totalContacts
  - totalSent
  - totalOpened
  - totalReplied
data_model: "[[entities/data-models/outreach-campaigns-table]]"
primary_key: id
depends_on: []
used_by:
  - "[[entities/functions/createCampaign]]"
  - "[[entities/functions/listCampaigns]]"
  - "[[entities/functions/getCampaign]]"
  - "[[entities/functions/updateCampaign]]"
last_commit_hash: ""
tested_by: []
tags:
  - entity
  - database
  - outreach
related:
  - "[[concepts/null-timestamp-epoch-guard]]"
sources:
  - "lib/db/schema.ts"
---

# outreach_campaigns (sql table)

## Overview

PostgreSQL `outreach_campaigns` table defined in Drizzle schema at `lib/db/schema.ts:835-879`. Stores campaign configuration (name, from-address, email templates, delays, schedule window), running stats (total_sent, total_opened, etc.), and send-control flags (test_mode, stop_on_auto_reply). Every campaign's timestamps are `NOT NULL DEFAULT now()` as of migration 0009 — see [[concepts/null-timestamp-epoch-guard]].

## Columns (selected)

| Column (Drizzle) | SQL | Constraints | Notes |
|---|---|---|---|
| id | id | PK, UUID, defaultRandom | |
| name | name | NOT NULL | Display name |
| status | status | nullable | draft / active / paused / completed |
| fromEmail | from_email | NOT NULL | Sender address |
| fromName | from_name | nullable | Display name |
| createdAt | created_at | NOT NULL DEFAULT now() | Fixed by migration 0009 |
| updatedAt | updated_at | NOT NULL DEFAULT now() | Fixed by migration 0009 |
| testMode | test_mode | nullable boolean | When true, worker logs but does not deliver |
| email1Template | email_1_template | NOT NULL DEFAULT `{{email_1_body}}` | Handlebars template |
| totalSent | total_sent | nullable int | Running send counter |
| totalOpened | total_opened | nullable int | Running open counter |

## Connections

- **related tables:** `outreach_contacts` (campaign_id FK), `outreach_schedules`, `outreach_campaign_senders`
- **query functions:** `createCampaign`, `listCampaigns`, `getCampaign`, `updateCampaign` (`lib/outreach/campaigns/`)
- **concept:** [[concepts/null-timestamp-epoch-guard]] — explains why `created_at` must be NOT NULL and why the UI uses the shared `formatDate` helper

## Migration history (timestamps)

| Migration | Change |
|---|---|
| 0000 | Initial table |
| 0004 | Added per-step email templates |
| 0005 | Added per-step subject templates |
| 0008 | Repaired template defaults on existing DBs |
| **0009** | **`created_at` / `updated_at` NOT NULL DEFAULT now() — backfilled existing NULLs** |

## Sources

- `lib/db/schema.ts` (lines 835–879)
- `lib/outreach/campaigns/actions.ts`
- `lib/outreach/campaigns/queries.ts`
