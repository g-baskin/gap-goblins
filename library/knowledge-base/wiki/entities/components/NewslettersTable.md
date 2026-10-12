---
type: entity
title: "NewslettersTable"
entity_type: react-component
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx"
language: tsx
props_summary: "onGenerate"
depends_on:
  - "[[entities/components/NewsletterEditionSheet]]"
  - "[[entities/endpoints/post-api-newsletter-id-send]]"
used_by: []
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - react-component
  - admin
related: []
sources:
  - "app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx"
partial_scan: true
---

# NewslettersTable

## Overview

Admin dashboard component that lists past newsletter editions in a table and provides per-row actions via a dropdown menu. Modified this session to add `handleSend` and `handleMarkSent` action handlers. Renders a `NewsletterEditionSheet` as a child for view/edit.

## Signature / Definition

```tsx
export interface NewslettersTableProps {
  onGenerate?: () => void;
}
export function NewslettersTable({ onGenerate }: NewslettersTableProps): JSX.Element
```

## Behavior

**Data fetching:** polls `GET /api/newsletter` on mount via `fetchNewsletters` (useCallback + useEffect) (`app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx:51–67`).

**Actions per row:**
- **View** — opens `NewsletterEditionSheet` in `"view"` mode.
- **Edit** (draft only) — opens `NewsletterEditionSheet` in `"edit"` mode.
- **Send newsletter** (draft only) — `handleSend`: confirms with user, POSTs `{ testMode: false }` to `POST /api/newsletter/{id}/send`, toasts success, refreshes list (`app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx:83–111`).
- **Mark as sent** (draft only) — `handleMarkSent`: confirms with user, PATCHes `{ status: "sent" }` to `PATCH /api/newsletter/{id}`, toasts success, refreshes list (`app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx:113–137`). Records it as sent without actually dispatching emails.
- **Clone** — stub (`toast.info("Clone feature coming soon")`).
- **Delete** (draft only) — DELETEs `DELETE /api/newsletter/{id}`, refreshes list.

**Status badge:** maps `draft → secondary`, `scheduled → default`, `sent → outline` Badge variants.

**Empty state:** displays an explanatory paragraph and an optional "Generate newsletter" button wired to `onGenerate` prop.

## Connections

- **depends_on:** [[entities/components/NewsletterEditionSheet]]
- **used_by:** (newsletter admin page — page.tsx in same directory)

## History

- **Modified:** commit `40438e4` — added `handleSend` and `handleMarkSent` (this session)

## Sources

- `app/admin/(dashboard)/newsletter/components/NewslettersTable.tsx` (lines 1–316)
