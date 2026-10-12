---
type: entity
title: "CloudflareSettingsPage"
entity_type: react-component
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "app/admin/(dashboard)/settings/cloudflare/page.tsx"
language: tsx
props_summary: "(client page — no props)"
depends_on:
  - "[[entities/modules/cloudflare-client]]"
  - "[[entities/endpoints/get-api-admin-cloudflare-status]]"
used_by: []
last_commit_hash: "5ed47facb1207f5922f5cbbf8897346de07d98ad"
tested_by:
  - "app/api/admin/cloudflare/__tests__/routes.test.ts"
tags:
  - entity
  - page
  - cloudflare
  - settings
related:
  - "[[concepts/cloudflare-settings-card-layout]]"
  - "[[concepts/cal-webhook-hooks-subdomain]]"
sources:
  - "app/admin/(dashboard)/settings/cloudflare/page.tsx"
---

# CloudflareSettingsPage

## Overview

Client component admin page for Cloudflare zone management: domain selection, credential diagnostics, DNS mapping checks, record tables, redirects, and email routing (`page.tsx:1-1916`).

Route: `/admin/settings/cloudflare`

## Layout

- `xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]` main + sidebar (`page.tsx:1204`).
- In-page helpers: `FieldValue`, `EnvVarStatus`, `LabeledStatusRow`, `DomainMappingDiagnosticCard` (`page.tsx:582-640`).

## Key behaviors

- Loads status via `/api/admin/cloudflare/status`; refreshes DNS, redirects, email data on zone change.
- **Sync DNS records** button calls DNS sync mutation when origin is configured and user is `super_admin`.
- Webhook bypass warning banner references locked grey-cloud `hooks` / `webhooks` requirement.
- Per-card help dialogs driven by `HELP_CONTENT` object (`page.tsx:268-450`).

## Connections

- **concept:** [[concepts/cloudflare-settings-card-layout]]
- **client:** [[entities/modules/cloudflare-client]]
- **guide:** `library/knowledge-base/guides/cloudflare-settings-ui.md`

## Sources

- `app/admin/(dashboard)/settings/cloudflare/page.tsx`
