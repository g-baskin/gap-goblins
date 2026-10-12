---
type: entity
title: "applySkin"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/apply-skin.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/components/SkinApplier]]"
  - "[[entities/components/skin-picker]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - theming
related:
  - "[[concepts/skin-preview-vs-applied]]"
sources:
  - "lib/apply-skin.ts"
---

# applySkin

## Overview

Injects persisted admin theme CSS into a `<style id="applied-skin">` element in `document.head` (`lib/apply-skin.ts:16-21`).

## Exports

Also exports `APPLIED_SKIN_STYLE_ID`, `PREVIEW_SKIN_STYLE_ID`, `applySkinPreview`, `removeSkinPreview`, `commitSkin` (`lib/apply-skin.ts:3-38`).

## Behavior

- Builds CSS via `buildSkinCss(skinId)` from `@/lib/themes` (`lib/apply-skin.ts:18-19`).
- `injectStyle` creates or updates style element by id (`lib/apply-skin.ts:6-14`).

## Connections

- **concept:** [[concepts/skin-preview-vs-applied]]

## Sources

- `lib/apply-skin.ts` (lines 1–38)
