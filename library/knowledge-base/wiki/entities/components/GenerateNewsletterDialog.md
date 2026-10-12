---
type: entity
title: "GenerateNewsletterDialog"
entity_type: react-component
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "components/newsletter/GenerateNewsletterDialog.tsx"
language: tsx
props_summary: "open, onOpenChange, onGenerated"
depends_on:
  - "[[entities/endpoints/post-api-newsletter-generate]]"
  - "[[entities/modules/newsletter-edition-length]]"
used_by:
  - "[[entities/components/NewslettersTable]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - react-component
related: []
sources:
  - "components/newsletter/GenerateNewsletterDialog.tsx"
partial_scan: true
---

# GenerateNewsletterDialog

## Overview

Modal dialog for manually generating a newsletter edition. Modified this session to expose three new controls: a **length preset** selector (short / medium / long), a **topic / theme** text input, and a **source checklist** pre-populated from `DEFAULT_RSS_SOURCES` with the ability to add custom RSS feeds.

## Signature / Definition

```tsx
export interface GenerateNewsletterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: () => void;
}
export function GenerateNewsletterDialog(props: GenerateNewsletterDialogProps): JSX.Element
```

## Behavior

**State:** `loading`, `length: NewsletterLength`, `topic: string`, `sourcePresets: SourcePreset[]`, `customUrl`, `customName`.

**Source initialisation** (`useEffect` on `[open]`): resets all fields and rebuilds `sourcePresets` from `DEFAULT_RSS_SOURCES` (`components/newsletter/GenerateNewsletterDialog.tsx:65–73`). Each preset starts with `enabled: true`.

**Source management:**
- `toggleSource(id, checked)` — flips `enabled` on a single preset.
- `addCustomSource()` — validates URL (must be http/https), deduplicates against existing presets, appends with `enabled: true` (`components/newsletter/GenerateNewsletterDialog.tsx:79–106`).

**`handleGenerate`** (`components/newsletter/GenerateNewsletterDialog.tsx:108`):
1. Filters `sourcePresets` to `enabled` entries.
2. Guards against empty selection.
3. POSTs `{ manual: true, length, topic: topic.trim() || undefined, sources: selectedSources }` to `POST /api/newsletter/generate`.
4. Uses the classified `data.error || data.message` as the toast message on failure — surfaces API-side error classification to the user.

**Topic field note:** a non-empty topic is forwarded to the API where it feeds `applyTopicBoost` in the orchestrator and shapes the AI-generated subject line.

## Connections

- **depends_on:** [[entities/endpoints/post-api-newsletter-generate]], [[entities/modules/newsletter-edition-length]]
- **used_by:** [[entities/components/NewslettersTable]] (via `onGenerate` callback → parent opens this dialog)

## History

- **Modified:** commit `40438e4` — added length selector, topic field, source checklist (this session)

## Sources

- `components/newsletter/GenerateNewsletterDialog.tsx` (lines 1–263)
