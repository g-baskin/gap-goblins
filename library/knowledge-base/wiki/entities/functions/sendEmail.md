---
type: entity
title: "sendEmail"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/outreach/sending/sender.ts"
language: ts
depends_on:
  - "[[entities/modules/db-client]]"
  - "[[entities/functions/getThreadingHeaders]]"
used_by:
  - "[[entities/modules/worker-process]]"
  - "[[entities/queues/outreach-send-email]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "lib/outreach/sending/__tests__/threading.test.ts"
tags:
  - entity
  - outreach
related:
  - "[[concepts/outreach-reply-to-matching]]"
sources:
  - "lib/outreach/sending/sender.ts"
---

# sendEmail

## Overview

Sends outreach sequence emails via Resend, syncs domain tracking settings, sets plain-mailbox Reply-To, applies threading headers, and updates contact/campaign state (`lib/outreach/sending/sender.ts:1-3`).

## Signature / Definition

Exported async function `sendEmail(resend, contact, campaign, emailNumber, unsubscribeUrl, options)` (defined later in file; called from worker at `scripts/worker.ts:244-251`).

## Behavior

- **CRITICAL Reply-To:** `replyTo = fromEmail` — sender's plain mailbox, never `reply+<uuid>@` (`lib/outreach/sending/sender.ts:237-251`, `286`).
- Syncs Resend domain open/click tracking to campaign prefs via `syncDomainTracking` (`sender.ts:40-100`).
- Uses `getThreadingHeaders` for sequences 2/3 (`lib/outreach/sending/threading.ts`).
- Stores Resend message ID on contact for inbound matching.

## Connections

- **used_by:** worker `handleOutreachSendEmail`
- **concepts:** [[concepts/outreach-reply-to-matching]]

## Sources

- `lib/outreach/sending/sender.ts` (lines 237–286)
- `scripts/worker.ts` (lines 244–251)
