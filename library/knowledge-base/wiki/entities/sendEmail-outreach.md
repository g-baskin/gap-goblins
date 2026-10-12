---
type: entity
title: "sendEmail (outreach)"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/outreach/sending/sender.ts"
language: ts
depends_on:
  - "[[entities/getThreadingHeaders]]"
used_by:
  - "[[entities/handleOutreachSendEmail]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - outreach
related:
  - "[[concepts/outreach-reply-to-threading]]"
sources:
  - "lib/outreach/sending/sender.ts"
---

# sendEmail (outreach)

## Overview

Sends outreach sequence emails via Resend. Sets **Reply-To to sender's plain mailbox** (never `reply+uuid@`), stores Resend message ID on contact for inbound threading, and applies RFC 8058 List-Unsubscribe headers (`lib/outreach/sending/sender.ts:237-308`).

## Behavior

- Selects load-balanced sender via `selectAvailableSender()` (`lib/outreach/sending/sender.ts:111-119`).
- `replyTo = fromEmail` — locked rule (`lib/outreach/sending/sender.ts:251`).
- Threading headers from [[entities/getThreadingHeaders]] for emails 2/3 (`lib/outreach/sending/sender.ts:296-297`).
- Persists `email_N_resend_id` after send for In-Reply-To matching (`lib/outreach/sending/sender.ts:382-401`).

## Connections

- **concept:** [[concepts/outreach-reply-to-threading]]
- **queue handler:** [[entities/handleOutreachSendEmail]]

## Sources

- `lib/outreach/sending/sender.ts` (lines 104–468)
