# Cloudflare Integration

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

Admin module for Cloudflare zone management: DNS records, redirects, email routing, and diagnostics — via `lib/cloudflare/client.ts`.

**Related:**
- [`deployment.md`](deployment.md)
- [`lib/cloudflare/client.ts`](../../../lib/cloudflare/client.ts)
- [`app/api/admin/cloudflare/`](../../../app/api/admin/cloudflare/)

---

## Overview

Settings UI exposes Cloudflare operations so operators can manage infrastructure without leaving the admin dashboard. All calls go through the Cloudflare REST API v4 with credentials from environment variables.

**Session required** — routes under `/api/admin/cloudflare/*` require authenticated admin.

---

## Required environment

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with zone DNS + rules permissions |
| `CLOUDFLARE_ZONE_ID` | Target zone |
| `CLOUDFLARE_ACCOUNT_ID` | Account context (some endpoints) |
| `CLOUDFLARE_ZONE_NAME` | Zone name for lookups |
| `CLOUDFLARE_ORIGIN_PROVIDER` | `manual` \| `railway` \| `vercel` |
| `CLOUDFLARE_ORIGIN_TARGET` | CNAME target for apex/www |
| `CLOUDFLARE_RAILWAY_TARGET` | Railway hostname when provider=railway |

Optional vars documented in `lib/cloudflare/types.ts` (`CLOUDFLARE_ENV_VARS`).

---

## API surface (admin)

| Route group | Capabilities |
|---|---|
| `/api/admin/cloudflare/status` | Connection + zone summary |
| `/api/admin/cloudflare/status/diagnostics` | Deep diagnostic checks |
| `/api/admin/cloudflare/dns/records` | List/create/update/delete DNS |
| `/api/admin/cloudflare/redirects` | Single Redirect ruleset |
| `/api/admin/cloudflare/email/routing/enable` | Enable email routing |
| `/api/admin/cloudflare/email/destinations` | Destination addresses |
| `/api/admin/cloudflare/email/rules` | Routing rules CRUD |

Tests: `app/api/admin/cloudflare/__tests__/routes.test.ts`

---

## DNS patterns for template-crm

### Apex / www (orange cloud)

Marketing/admin apex sits behind Cloudflare proxy for DDoS and Bot Fight Mode.

### hooks subdomain (grey cloud — locked)

```
CNAME hooks → <railway-website>.up.railway.app   (DNS only)
TXT   _railway-verify.hooks → railway-verify=...
```

Cal.com webhooks **must** target `https://hooks.__YOUR_DOMAIN__/api/webhooks/cal`. Orange-clouding `hooks` breaks booking sync.

See `app/api/webhooks/cal/README.md` and [`guides/locked-business-rules.md`](../guides/locked-business-rules.md).

---

## Client architecture

`lib/cloudflare/client.ts`:

- Central `cloudflareRequest()` with typed results
- Pagination helpers (`DEFAULT_PER_PAGE = 100`)
- Origin config resolution for Railway/Vercel/manual targets
- Structured errors via `CloudflareClientError`

Types: `lib/cloudflare/types.ts`

---

## Admin UI

Route: `/admin/settings/cloudflare` → `app/admin/(dashboard)/settings/cloudflare/page.tsx`

Two-column layout (main + email sidebar on `xl`). Cards cover domain selection, credential/env status, domain mapping diagnostics, DNS sync, DNS record table, redirects, email routing, destinations, forwarding aliases, and Railway verification TXT.

**Layout guide:** [`guides/cloudflare-settings-ui.md`](../guides/cloudflare-settings-ui.md) — documents card helpers, grid rules, and the May 2026 UX pass (no 4-column summary in narrow panes, single-column diagnostics, horizontal-scroll tables).

**Wiki:** [[concepts/cloudflare-settings-card-layout]] · [[entities/pages/cloudflare-settings-page]]

---

## Related docs

- [`requirements/features/feature-006-cloudflare-settings/`](../../requirements/features/feature-006-cloudflare-settings/)
- [`api/admin-api.md`](../api/admin-api.md)

---

## Changelog

- v1.1 (2026-05) — Admin UI section + link to `guides/cloudflare-settings-ui.md`.
- v1.0 (2026-05) — Initial Cloudflare integration doc.
