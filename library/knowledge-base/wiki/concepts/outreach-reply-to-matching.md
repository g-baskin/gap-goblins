---
type: concept
title: "Outreach Reply-To and In-Reply-To matching"
complexity: advanced
domain: outreach
aliases:
  - "reply-to matching"
  - "Message-ID threading"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - outreach
related:
  - "[[entities/functions/sendEmail]]"
  - "[[entities/functions/handleEmailReceived]]"
sources:
  - "lib/outreach/sending/sender.ts"
  - "lib/outreach/webhooks/events/received.ts"
  - "lib/outreach/lib/utils.ts"
---

# Outreach Reply-To and In-Reply-To matching

## Definition

Outbound outreach sets `Reply-To` to the sender's plain mailbox (not `reply+<uuid>@`). Inbound replies are matched to outreach contacts via UUIDs embedded in `In-Reply-To` / `References` headers, which reference Resend send IDs stored on the contact row.

## How it works

**Outbound:** `sendEmail` sets `replyTo = fromEmail` (sender mailbox) (`lib/outreach/sending/sender.ts:237-251`, `lib/outreach/sending/sender.ts:286`).

**Inbound primary path:** `handleEmailReceived` extracts UUIDs from `in-reply-to` and `references` headers, then queries `outreach_contacts.email{1,2,3}_resend_id` (`lib/outreach/webhooks/events/received.ts:128-156`).

**Legacy fallback:** UUID in `To` address via `reply+uuid@` pattern (`lib/outreach/lib/utils.ts:44-45`, `received.ts:60-126`).

**Secondary fallback:** match `from` email to outreach contact (`received.ts:165-189`).

## Why it matters

Plain Reply-To preserves deliverability and trust in Gmail/Outlook. Threading headers replace UUID-suffixed reply addresses for contact resolution.

## Examples in this codebase

- [[entities/functions/sendEmail]] — sets plain mailbox Reply-To
- [[entities/functions/handleEmailReceived]] — header-based routing

## Sources

- `lib/outreach/sending/sender.ts` (lines 237–286)
- `lib/outreach/webhooks/events/received.ts` (lines 128–189)
- `lib/outreach/lib/utils.ts` (lines 21–45)
