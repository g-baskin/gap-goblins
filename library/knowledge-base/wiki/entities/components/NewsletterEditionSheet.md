---
type: entity
title: "NewsletterEditionSheet"
entity_type: react-component
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "components/newsletter/NewsletterEditionSheet.tsx"
language: tsx
props_summary: "editionId, open, onOpenChange, mode, onSaved"
depends_on:
  - "[[entities/endpoints/post-api-newsletter-id]]"
used_by:
  - "[[entities/components/NewslettersTable]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - react-component
  - tiptap
related: []
sources:
  - "components/newsletter/NewsletterEditionSheet.tsx"
partial_scan: true
---

# NewsletterEditionSheet

## Overview

Client-side Sheet (slide-over panel) for viewing and editing individual newsletter editions. Major rewrite this session. Now embeds a two-tab content editor: a **Visual** tab backed by Tiptap WYSIWYG and an **HTML** tab (raw textarea). Two module-level helper functions, `extractBody` and `replaceBody`, bridge Tiptap's fragment-based editing with the full `<!DOCTYPE html>` document stored in the database.

## Signature / Definition

```tsx
export interface NewsletterEditionSheetProps {
  editionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSaved?: () => void;
}
export function NewsletterEditionSheet(props: NewsletterEditionSheetProps): JSX.Element
```

## Behavior

**State:** `loading`, `saving`, `subject`, `preheader`, `contentHtml`, `status`, `articleCount`, `activeTab: "visual" | "html"` (`lib/newsletter/NewsletterEditionSheet.tsx:221–228`).

**Read-only mode** is derived: `readOnly = mode === "view" || status !== "draft"` (`components/newsletter/NewsletterEditionSheet.tsx:230`). Non-draft editions are always read-only regardless of `mode` prop.

**Tiptap editor** is always mounted (`useEditor`), configured with StarterKit, Underline, Link, TextAlign extensions (`components/newsletter/NewsletterEditionSheet.tsx:235–244`). Editable flag tracks `!readOnly`.

**Data loading** (`useEffect` on `[open, editionId]`): fetches `GET /api/newsletter/{editionId}`, populates all state fields, then calls `syncEditorFromHtml(html)` via `setTimeout(0)` to let state settle before Tiptap ingests the extracted body (`components/newsletter/NewsletterEditionSheet.tsx:258–307`).

**Tab switching** (`handleTabSwitch`):
- Visual → HTML: flushes Tiptap HTML back into `contentHtml` via `replaceBody` first.
- HTML → Visual: injects current `contentHtml` body into Tiptap via `extractBody`.

**Save** (`handleSave`): if on Visual tab, re-syncs Tiptap → full HTML before PATCHing `PATCH /api/newsletter/{editionId}` with `{subject, preheader, contentHtml}` (`components/newsletter/NewsletterEditionSheet.tsx:341–382`).

**View mode** renders a `dangerouslySetInnerHTML` preview div (admin-only) instead of the editor (`components/newsletter/NewsletterEditionSheet.tsx:432–441`).

### Helper functions

**`extractBody(html)`** (`components/newsletter/NewsletterEditionSheet.tsx:40–43`): Regex-extracts the content between `<body>` tags. Falls back to the full string if no body tags are present.

**`replaceBody(fullHtml, newBody)`** (`components/newsletter/NewsletterEditionSheet.tsx:45–50`): Splices `newBody` back into the full HTML document preserving `<body>` attributes. Falls back to `newBody` if no body tags present.

## Connections

- **depends_on:** `GET /api/newsletter/{id}`, `PATCH /api/newsletter/{id}`
- **used_by:** [[entities/components/NewslettersTable]]

## History

- **Modified:** commit `40438e4` — major rewrite; added Tiptap two-tab editor, extractBody/replaceBody helpers (this session)

## Sources

- `components/newsletter/NewsletterEditionSheet.tsx` (lines 1–514)
