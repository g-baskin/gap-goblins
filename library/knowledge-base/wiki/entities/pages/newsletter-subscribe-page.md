---
type: entity
title: newsletter-subscribe-page
entity_type: react-component
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: app/newsletter/subscribe/page.tsx
language: tsx
depends_on:
  - "[[entities/components/SubscribeForm]]"
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - page
  - newsletter
sources:
  - app/newsletter/subscribe/page.tsx
partial_scan: true
---

# newsletter-subscribe-page

## Overview

Server Component public page at `/newsletter/subscribe`. Fetches branding from `/api/newsletter/settings` and passes props to `SubscribeForm` (`app/newsletter/subscribe/page.tsx:21-50`).

## Behavior

- `metadata.robots.index = false` — not indexed (`:7`).
- `getFormBranding()` server fetch with `cache: "no-store"` (`:21-34`).
- Heading/subtext rendered outside form; form receives colour and field toggles.

## Sources

- `app/newsletter/subscribe/page.tsx` (lines 1-90)
