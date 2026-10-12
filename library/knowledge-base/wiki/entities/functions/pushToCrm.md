---
type: entity
title: "pushToCrm"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-28"
path: "lib/outreach/crm/push-to-crm.ts"
language: ts
depends_on:
  - "[[entities/modules/db-client]]"
  - "[[entities/functions/writeTimelineEvent]]"
used_by:
  - "[[entities/functions/handleEmailReceived]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - outreach
  - crm
related:
  - "[[concepts/crm-status-hierarchy]]"
  - "[[concepts/deal-stage-promotion-rules]]"
  - "[[concepts/crm-pipeline-stage-promotion]]"
sources:
  - "lib/outreach/crm/push-to-crm.ts"
---

# pushToCrm

## Overview

Upserts an outreach contact into CRM as `lead` via hierarchy-protected RPC, writes timeline events, and creates an open deal at the **Contacted** stage (`lib/outreach/crm/push-to-crm.ts:7-120`). Does not promote to Meeting Booked — only Cal.com booking webhooks do that (`lib/outreach/crm/push-to-crm.ts:96-98`).

## Signature / Definition

```ts
export async function pushToCrm(
  contact: { email; firstName; lastName; company; ... },
  campaignName: string,
  options?: { aiSummary?; intent? }
): Promise<{ crmContactId; crmDealId } | null>
```

## Behavior

- Calls `upsert_contact_with_hierarchy_protection` RPC with `p_contact_status := 'lead'`, `p_source := 'outreach_reply'` (`push-to-crm.ts:31-46`).
- Enrichment fields updated on contact row if provided (`push-to-crm.ts:55-73`).
- Timeline: `contact_created`, `outreach_reply`, `deal_created` (`push-to-crm.ts:75-210`).
- Deal stage slug always `contacted` — never meeting-booked (`push-to-crm.ts:96-106`).
- Deal name format: `{year} {Company} | {Initial}.{LastName}` via `buildOutreachDealName` (`push-to-crm.ts:131-158`).

## Connections

- **depends_on:** [[entities/modules/db-client]], [[entities/functions/writeTimelineEvent]]
- **used_by:** [[entities/functions/handleEmailReceived]]
- **concepts:** [[concepts/deal-stage-promotion-rules]], [[concepts/crm-status-hierarchy]], [[concepts/crm-pipeline-stage-promotion]]

## Sources

- `lib/outreach/crm/push-to-crm.ts` (lines 10–231)
