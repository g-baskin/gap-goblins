---
type: entity
title: "EmailThread"
entity_type: react-component
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "components/admin/EmailThread.tsx"
language: tsx
props_summary: "messages, selfName, recipientEmail, onReply, onForward"
depends_on:
  - "[[entities/functions/DOMPurify]]"
used_by:
  - "[[entities/components/ReplyComposer]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - component
  - admin
  - inbox
sources:
  - "components/admin/EmailThread.tsx"
---

# EmailThread

## Overview

Client component rendering threaded outreach/inbox messages as expandable bubbles with sanitized HTML bodies, reply/forward actions, and AU locale timestamps (`components/admin/EmailThread.tsx:1-6`).

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| messages | ThreadMessage[] | yes | Thread messages with sender, subject, body, sentAt |
| selfName | string | no | Outbound display name (default "You") |
| recipientEmail | string | no | Shown as "To:" on outbound bubbles |
| onReply | (message) => void | no | Reply icon handler |
| onForward | (message) => void | no | Forward icon handler |

(`EmailThread.tsx:22-38`)

## Behavior

- Sanitizes HTML via DOMPurify before render.
- Formats dates with `en-AU` locale (`EmailThread.tsx:40-57`).
- Exports `ThreadMessage` interface (`EmailThread.tsx:8-20`).

## Sources

- `components/admin/EmailThread.tsx` (lines 1–304)
