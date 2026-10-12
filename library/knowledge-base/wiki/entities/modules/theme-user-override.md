---
type: entity
title: "theme-user-override module"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/theme-user-override.ts"
language: ts
exports:
  - "[[entities/functions/markThemeUserOverride]]"
depends_on: []
used_by:
  - "[[entities/components/skin-picker]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - theming
related:
  - "[[concepts/skin-preview-vs-applied]]"
sources:
  - "lib/theme-user-override.ts"
---

# theme-user-override module

## Overview

Module-level flag preventing late server hydration from overwriting a user-selected theme during Appearance editing (`lib/theme-user-override.ts:1-2`).

## Exports

- `markThemeUserOverride()` — sets flag true (`theme-user-override.ts:4-6`)
- `hasThemeUserOverride()` — read flag (`theme-user-override.ts:8-10`)
- `resetThemeUserOverride()` — clear flag (`theme-user-override.ts:12-14`)

## Connections

- **concept:** [[concepts/skin-preview-vs-applied]]

## Sources

- `lib/theme-user-override.ts` (lines 1–14)
