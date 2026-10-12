---
type: entity
title: "crm-contacts module"
entity_type: module
status: developing
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/crm/contacts.ts"
language: ts
exports:
  - "[[entities/functions/getContacts]]"
  - "[[entities/functions/bulkUpdateContacts]]"
depends_on:
  - "[[entities/modules/db-client]]"
  - "[[entities/data-models/contacts-table]]"
used_by:
  - "[[entities/endpoints/crm-contacts-route]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "lib/crm/__tests__/contacts.test.ts"
tags:
  - entity
  - crm
sources:
  - "lib/crm/contacts.ts"
---

# crm-contacts module

## Overview

CRM contact domain logic extracted from API routes: list/search/filter contacts, bulk update/delete, detail fetch, timeline integration (`lib/crm/contacts.ts:1-5`).

## Exports (selected)

- `getContacts(params)` — paginated list with search and status filter (`lib/crm/contacts.ts:30-31`).
- Uses `STATUS_RANK` from `./constants` for hierarchy-aware operations.
- Sanitizes search input via `sanitizeSearchForOrFilter` (`lib/crm/contacts.ts:36-37`).

## Connections

- **depends_on:** [[entities/modules/db-client]], [[entities/data-models/contacts-table]]
- **API routes:** `app/api/crm/contacts/*`

## Sources

- `lib/crm/contacts.ts` (lines 1–80+)
