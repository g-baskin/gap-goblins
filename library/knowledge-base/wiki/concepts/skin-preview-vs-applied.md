---
type: concept
title: "Skin preview vs applied layer"
complexity: basic
domain: admin-ui
aliases:
  - "#skin-preview vs #applied-skin"
  - "theme preview commit"
created: "2026-05-27"
updated: "2026-05-27"
status: mature
tags:
  - concept
  - theming
related:
  - "[[entities/functions/applySkin]]"
  - "[[entities/modules/theme-user-override]]"
  - "[[entities/components/skin-picker]]"
sources:
  - "lib/apply-skin.ts"
  - "lib/theme-user-override.ts"
---

# Skin preview vs applied layer

## Definition

Admin appearance uses two injected `<style>` elements: `#applied-skin` (persisted theme across navigation) and `#skin-preview` (temporary while picking on Appearance page).

## How it works

| Function | Style element ID | Purpose |
|---|---|---|
| `applySkin` | `applied-skin` | Persist skin CSS on admin layout (`lib/apply-skin.ts:16-21`) |
| `applySkinPreview` | `skin-preview` | Temporary preview (`lib/apply-skin.ts:23-28`) |
| `removeSkinPreview` | removes preview | Cancel preview (`lib/apply-skin.ts:30-32`) |
| `commitSkin` | promotes preview | Calls `applySkin` + removes preview (`lib/apply-skin.ts:34-38`) |

`theme-user-override.ts` sets a module flag when the user picks locally so late server hydration does not overwrite (`lib/theme-user-override.ts:1-14`).

## Why it matters

Preview must not persist until save; applied layer must survive client navigation without full reload.

## Examples in this codebase

- [[entities/components/skin-picker]] — drives preview/commit UX
- [[entities/modules/theme-user-override]] — blocks hydration overwrite

## Sources

- `lib/apply-skin.ts` (lines 1–38)
- `lib/theme-user-override.ts` (lines 1–14)
