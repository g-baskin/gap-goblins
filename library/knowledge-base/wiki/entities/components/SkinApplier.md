---
type: entity
title: "SkinApplier"
entity_type: react-component
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "components/admin/SkinApplier.tsx"
language: tsx
props_summary: "(none — renders null)"
depends_on:
  - "[[entities/functions/applySkin]]"
  - "[[entities/endpoints/admin-settings-get]]"
used_by: []
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - component
  - theming
related:
  - "[[concepts/skin-preview-vs-applied]]"
sources:
  - "components/admin/SkinApplier.tsx"
---

# SkinApplier

## Overview

Null-render client component that fetches admin settings on mount and applies persisted skin CSS via `applySkin` (`components/admin/SkinApplier.tsx:6-21`).

## Behavior

- `useEffect` → `GET /api/admin/settings` → `applySkin(data.skinId || "concrete")` (`SkinApplier.tsx:7-12`).
- Errors swallowed (non-critical) (`SkinApplier.tsx:13-15`).

## Connections

- **depends_on:** [[entities/functions/applySkin]]
- **concept:** [[concepts/skin-preview-vs-applied]]

## Sources

- `components/admin/SkinApplier.tsx` (lines 1–22)
