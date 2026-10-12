---
type: entity
title: "writeTimelineEvent"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/crm/timeline.ts"
language: ts
depends_on:
  - "[[entities/modules/db-client]]"
used_by:
  - "[[entities/functions/pushToCrm]]"
  - "[[entities/endpoints/post-api-webhooks-cal]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - crm
sources:
  - "lib/crm/timeline.ts"
---

# writeTimelineEvent

## Overview

Inserts a row into `contact_timeline` for CRM activity feed events (`lib/crm/timeline.ts:21-29`).

## Signature / Definition

```ts
export async function writeTimelineEvent(
  eventOrClient: TimelineEventInput | unknown,
  maybeEvent?: TimelineEventInput
): Promise<void>
```

## Behavior

- Inserts `contactId`, `eventType`, `title`, metadata via Drizzle (`timeline.ts:27-29`).
- Errors logged; does not throw to callers (pattern in file).

## Connections

- **used_by:** [[entities/functions/pushToCrm]], Cal webhook route

## Sources

- `lib/crm/timeline.ts` (lines 21–29)
