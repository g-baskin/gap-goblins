---
type: entity
title: "ReplyComposer"
entity_type: react-component
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "components/admin/ReplyComposer.tsx"
language: tsx
props_summary: "replyId, recipientName, recipientEmail, initialMessage, aiSuggestion, isSent, onSent, onDiscard"
depends_on:
  - "[[entities/endpoints/admin-reply-send-route]]"
used_by:
  - "[[entities/components/EmailThread]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts"
tags:
  - entity
  - component
  - inbox
related:
  - "[[concepts/outreach-reply-to-matching]]"
sources:
  - "components/admin/ReplyComposer.tsx"
---

# ReplyComposer

## Overview

Admin inbox client component for composing and sending manual replies to outreach contacts, with optional AI suggestion via explicit user action (`components/admin/ReplyComposer.tsx:27-30`).

## Props

| Prop | Required | Notes |
|---|---|---|
| replyId | yes | Outreach reply record ID |
| recipientName / recipientEmail | yes | Display + send target |
| initialMessage | no | Pre-load draft |
| aiSuggestion | no | Shown only on Ask AI click, not auto-inserted |
| onSent | no | Callback after successful send |

(`ReplyComposer.tsx:18-36`)

## Behavior

- Posts to admin reply send API route (must set plain mailbox Reply-To per locked rule).
- AI suggestion requires explicit user trigger (`ReplyComposer.tsx:28-30`).

## Sources

- `components/admin/ReplyComposer.tsx` (lines 18–45+)
