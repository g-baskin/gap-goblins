# Cloudflare Settings UI

> Category: Guide | Version: 1.0 | Date: May 2026 | Status: Active

Layout and component conventions for **Settings → Cloudflare** (`app/admin/(dashboard)/settings/cloudflare/page.tsx`).

**Related:**
- [`architecture/cloudflare-integration.md`](../architecture/cloudflare-integration.md)
- [`requirements/features/feature-006-cloudflare-settings/`](../../requirements/features/feature-006-cloudflare-settings/)

---

## Page layout

Two-column grid on `xl` breakpoints:

| Column | Width | Contents |
|---|---|---|
| Main (left) | `minmax(0, 1fr)` | Domain selector, credentials, diagnostics, DNS table, redirects |
| Sidebar (right) | `340px–420px` | Email routing, destinations, forwarding aliases, Railway TXT |

Below `xl`, columns stack vertically.

---

## Shared card helpers (in-page)

Defined in `page.tsx` — reuse these patterns when adding cards:

| Helper | Purpose |
|---|---|
| `FieldValue` | Label + value in muted bordered box. Values use `break-words`, not `break-all`. |
| `EnvVarStatus` | Monospace env var name stacked above Set/Missing badge. |
| `LabeledStatusRow` | Short label + badge; stacks on mobile, row on `sm+`. |
| `DomainMappingDiagnosticCard` | Single diagnostic row: title, expected record, status badge, message, scrollable record list (`max-h-48`). |
| `HelpedCardHeader` | Title + description + help dialog trigger. |

---

## Layout rules (2026-05-27 UX pass)

These rules prevent overlap in the narrow left column:

1. **Summary fields** — `grid-cols-1 sm:grid-cols-2` only. Never four columns in the left pane (words like "Configured" and domain names were fragmenting).
2. **Environment variables** — two-column grid max; stacked name + badge per cell.
3. **Domain mapping diagnostics** — single-column stack (`grid-cols-1`). One card per apex/www/hooks/webhooks.
4. **Sync DNS action** — vertical stack: description block, then full-width button (`Sync DNS records`). No side-by-side button in narrow columns.
5. **DNS / redirect tables** — parent `overflow-x-auto`; table `w-max min-w-[720px]` with column `min-w-*`. Name column uses `break-words`; content uses `break-all` for long TXT values.
6. **Email sidebar cards** — list rows use `min-w-0` + `break-all` on emails; badges `shrink-0`.

---

## Card inventory

| Card | Column | Data source |
|---|---|---|
| Domain selector | Left | `GET /api/admin/cloudflare/status` → zones |
| Credential and config status | Left | `status.config`, `status.credentials` |
| Domain mapping diagnostics | Left | `status.diagnostics.domainMapping` |
| Sync expected DNS mapping | Left | Mutation → DNS sync handler |
| DNS records | Left | `GET /api/admin/cloudflare/dns/records` |
| Redirects | Left | `GET /api/admin/cloudflare/redirects` |
| Email Routing status | Right | `status.emailRouting` |
| Destination addresses | Right | destinations API |
| Forwarding aliases | Right | email rules API |
| Railway verification TXT | Right | `status.diagnostics.railwayVerificationTxtRecords` |

---

## Help content

Each card has a `HELP_CONTENT.*` entry with title, summary, and sections for the info dialog. Extend `HELP_CONTENT` when adding cards — do not inline help prose in JSX.

---

## Changelog

- v1.0 (2026-05) — Documented layout rules after Cloudflare settings UX fixes (credential grid, diagnostics stack, sync button, scrollable tables).
