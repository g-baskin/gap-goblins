---
type: entity
title: newsletter_subscribers table
entity_type: data-model
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: lib/db/schema.ts
language: ts
last_commit_hash: bae75e95677ef5014b1709c08d53c00401409335
tags:
  - entity
  - data-model
  - newsletter
related:
  - "[[entities/modules/newsletter-subscribers]]"
sources:
  - lib/db/schema.ts
partial_scan: true
---

# newsletter_subscribers table

## Overview

Drizzle model `newsletterSubscribers` — audience list for newsletter sends and signup flow (`lib/db/schema.ts:758-795`).

## Key columns (signup flow)

| Drizzle field | PG column | Notes |
|---|---|---|
| `email` | `email` | Required; lookup key |
| `verified` | `verified` | Default false |
| `verificationToken` | `verification_token` | Cleared on verify |
| `verificationTokenExpiresAt` | `verification_token_expires_at` | 24h window |
| `consentGivenAt` | `consent_given_at` | Set on subscribe |
| `consentIpAddress` | `consent_ip_address` | From subscribe request |
| `consentUserAgent` | `consent_user_agent` | From subscribe request |
| `unsubscribed` | `unsubscribed` | Default false |
| `source` | `source` | e.g. `website`, `admin_manual` |

Indexes: `verified`, `unsubscribed` (`:791-794`).

## Sources

- `lib/db/schema.ts` (lines 758-795)
