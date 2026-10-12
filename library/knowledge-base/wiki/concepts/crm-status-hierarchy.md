---
type: concept
title: "CRM contact status hierarchy"
complexity: basic
domain: crm
aliases:
  - "status hierarchy protection"
  - "subscriber lead qualified customer"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - crm
related:
  - "[[entities/data-models/contacts-table]]"
  - "[[entities/functions/pushToCrm]]"
sources:
  - "lib/crm/constants.ts"
  - "lib/outreach/crm/push-to-crm.ts"
---

# CRM contact status hierarchy

## Definition

Contact statuses form a strict rank order: subscriber (0) < lead (1) < qualified (2) < customer (3). Upserts via RPC never downgrade an existing contact to a lower rank.

## How it works

`STATUS_RANK` in `lib/crm/constants.ts:1-6` defines numeric ranks. `pushToCrm` calls `upsert_contact_with_hierarchy_protection` with `p_contact_status := 'lead'` (`lib/outreach/crm/push-to-crm.ts:31-46`). The PostgreSQL RPC enforces monotonic status (referenced in CLAUDE.md and `.claude/rules/drizzle-patterns.md`).

## Why it matters

A newsletter subscriber who later replies to outreach must become at least `lead`, but a `qualified` contact must not revert to `lead` on a duplicate upsert.

## Examples in this codebase

- [[entities/functions/pushToCrm]] — outreach reply upsert at lead rank
- Cal.com webhook — promotes to `qualified` on booking (see [[concepts/deal-stage-promotion-rules]])

## Sources

- `lib/crm/constants.ts` (lines 1–6)
- `lib/outreach/crm/push-to-crm.ts` (lines 31–46)
