---
type: entity
title: SubscribeForm
entity_type: react-component
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: components/newsletter/SubscribeForm.tsx
language: tsx
props_summary: "buttonText, successText, primaryColor, showName, showBusiness, showIndustry"
depends_on:
  - "[[entities/endpoints/post-api-newsletter-subscribe]]"
used_by:
  - "[[entities/pages/newsletter-subscribe-page]]"
last_commit_hash: uncommitted-2026-05-28
tags:
  - entity
  - react-component
  - newsletter
related:
  - "[[entities/pages/subscribe-form-settings-page]]"
sources:
  - components/newsletter/SubscribeForm.tsx
partial_scan: true
---

# SubscribeForm

## Overview

Client Component for public newsletter signup. Posts JSON to `/api/newsletter/subscribe` with required `consent: true` (`components/newsletter/SubscribeForm.tsx:47-60`).

## Signature / Definition

```tsx
export function SubscribeForm(props?: SubscribeFormProps): JSX.Element
```

Props: `buttonText`, `successText`, `primaryColor`, `showName`, `showBusiness`, `showIndustry` — all optional with defaults (`:5-21`, `:29-36`).

## Behavior

- States: idle, loading, success, error (`SubscribeFormState` `:23-27`).
- Conditionally renders name/business/industry fields from props (`showName`, etc.).
- Uses inline styles with `primaryColor` for button accent.

## Connections

- **depends_on:** [[entities/endpoints/post-api-newsletter-subscribe]]
- **used_by:** `/newsletter/subscribe` Server Component passes branding from settings API

## Sources

- `components/newsletter/SubscribeForm.tsx` (lines 1-290)
