---
type: concept
title: "Cloudflare settings card layout"
status: mature
created: "2026-05-27"
updated: "2026-05-27"
depends_on:
  - "[[entities/pages/cloudflare-settings-page]]"
  - "[[entities/modules/cloudflare-client]]"
tags:
  - concept
  - cloudflare
  - admin-ui
related:
  - "[[concepts/cal-webhook-hooks-subdomain]]"
sources:
  - "app/admin/(dashboard)/settings/cloudflare/page.tsx"
  - "library/knowledge-base/guides/cloudflare-settings-ui.md"
---

# Cloudflare settings card layout

## Overview

The Cloudflare admin screen uses a **two-column xl grid** with card helpers that **stack vertically inside the left column** — never squeeze four summary fields or two diagnostic cards side-by-side in a narrow pane (`page.tsx:1204-1205`, `page.tsx:1315-1323`).

## Pattern

```
┌─────────────────────────────┬──────────────────┐
│ Domain selector             │ Email routing    │
│ Credentials (2×2 summary)   │ Destinations     │
│ Diagnostics (1 col stack)   │ Forwarding       │
│ Sync DNS (stacked button)   │ Railway TXT      │
│ DNS table (horizontal scroll)│                 │
│ Redirects                   │                  │
└─────────────────────────────┴──────────────────┘
```

## Rules

| Surface | Layout |
|---|---|
| Config summary | `grid-cols-1 sm:grid-cols-2` + `FieldValue` with `break-words` |
| Env vars | `EnvVarStatus`: name stacked above badge, 2-col grid |
| Diagnostics | `DomainMappingDiagnosticCard` in `grid-cols-1` |
| Sync action | Text block then `w-full sm:w-auto` button |
| Tables | `overflow-x-auto` + `w-max min-w-[720px]` |

## Why

The left column is ~60% of viewport minus a 340–420px sidebar. Multi-column flex rows caused badge overlap and mid-word breaks on domain names during May 2026 UX fixes.

## Connections

- **page:** [[entities/pages/cloudflare-settings-page]]
- **guide:** `library/knowledge-base/guides/cloudflare-settings-ui.md`
- **webhook DNS:** [[concepts/cal-webhook-hooks-subdomain]]

## Sources

- `app/admin/(dashboard)/settings/cloudflare/page.tsx` (layout grid, helper components)
- `library/knowledge-base/guides/cloudflare-settings-ui.md`
