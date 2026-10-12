---
type: entity
title: "SkinPicker"
entity_type: react-component
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "components/settings/skin-picker.tsx"
language: tsx
props_summary: "currentSkinId, onSkinSaved"
depends_on:
  - "[[entities/functions/applySkin]]"
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
  - "components/settings/skin-picker.tsx"
---

# SkinPicker

## Overview

Appearance settings UI listing skins from `SKINS`, previewing selection via `applySkinPreview`, and committing on save with `commitSkin` (`components/settings/skin-picker.tsx:7-9`, `36-39`).

## Props

- `currentSkinId: string` — saved skin from server (`skin-picker.tsx:11-12`)
- `onSkinSaved?: (skinId) => void` — callback after persist (`skin-picker.tsx:13`)

## Behavior

- `handleSelect` updates preview state and calls `applySkinPreview` (`skin-picker.tsx:36-39`).
- Cleanup on unmount removes preview style (`skin-picker.tsx:30-34`).
- `hasChanges` tracks preview vs saved (`skin-picker.tsx:23`).

## Connections

- **concept:** [[concepts/skin-preview-vs-applied]]

## Sources

- `components/settings/skin-picker.tsx` (lines 1–40+)
