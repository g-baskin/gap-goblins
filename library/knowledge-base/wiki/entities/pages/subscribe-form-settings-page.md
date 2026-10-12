---
type: entity
title: subscribe-form-settings-page
entity_type: react-component
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: app/admin/(dashboard)/settings/subscribe-form/page.tsx
language: tsx
depends_on:
  - "[[entities/endpoints/api-admin-subscribers]]"
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - page
  - admin
  - newsletter
related:
  - "[[entities/components/SubscribeForm]]"
sources:
  - app/admin/(dashboard)/settings/subscribe-form/page.tsx
partial_scan: true
---

# subscribe-form-settings-page

## Overview

Admin hub at `/admin/settings/subscribe-form` for subscribe form branding, live iframe preview, embed snippets, and manual subscriber add (`app/admin/(dashboard)/settings/subscribe-form/page.tsx`).

## Behavior

- Loads/saves branding via `GET/PATCH /api/newsletter/settings` (`FormConfig` keys: `formHeading`, `formSubtext`, etc. — `:28-50`).
- Live preview iframe points at `/newsletter/subscribe` (`iframeKey` refresh on save).
- Embed snippets: direct link and popup window variants (`:72-74`).
- Manual add posts to [[entities/endpoints/api-admin-subscribers]] with optional skip confirmation.

## Sources

- `app/admin/(dashboard)/settings/subscribe-form/page.tsx` (lines 1-477)
