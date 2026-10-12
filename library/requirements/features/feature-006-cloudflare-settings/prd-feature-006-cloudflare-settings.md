# Feature #006: Cloudflare Settings (Retroactive)

> **template-crm / admin-platform** — Feature PRD #006
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P2
> **Schema changes:** None (uses env + Cloudflare API); optional encrypted creds in `integration_credentials`

---

## Phase Overview

### Problem statement

Fork operators manage DNS, redirects, and email routing in Cloudflare daily. Embedding a admin module avoids context-switching to the Cloudflare dashboard and encodes template-specific DNS patterns (especially the grey-cloud `hooks` subdomain).

### Goals (as shipped)

- Cloudflare API client with typed requests and pagination.
- Admin UI section for zone status and diagnostics.
- DNS record CRUD.
- Single Redirect ruleset management.
- Email routing: enable, destinations, rules CRUD.
- Origin target helpers for Railway/Vercel/manual.

### Scope

- Settings → Cloudflare in admin UI
- `/api/admin/cloudflare/*`
- `lib/cloudflare/client.ts`, `lib/cloudflare/types.ts`

---

## User Flows (as shipped)

1. Admin configures `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, etc. in Railway env.
2. Admin opens Cloudflare settings → status shows zone connectivity.
3. Admin adds/edits DNS records (e.g. apex → Railway, hooks → Railway grey cloud).
4. Admin configures email routing rules for transactional addresses.
5. Admin sets redirect rules for www/apex normalization.

---

## API Surface (shipped)

| Method | Path |
|---|---|
| GET | `/api/admin/cloudflare/status` |
| GET | `/api/admin/cloudflare/status/diagnostics` |
| GET, POST, PATCH, DELETE | `/api/admin/cloudflare/dns/records` |
| GET, PUT | `/api/admin/cloudflare/redirects` |
| POST | `/api/admin/cloudflare/email/routing/enable` |
| GET, POST | `/api/admin/cloudflare/email/destinations` |
| GET, POST, PATCH, DELETE | `/api/admin/cloudflare/email/rules` |

All require NextAuth session.

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(dashboard)/settings/cloudflare/page.tsx` | Settings UI (~1900 lines): cards, diagnostics, DNS/redirect/email forms |
| `app/api/admin/cloudflare/` | Route handlers |
| `app/api/admin/cloudflare/_lib/diagnostics.ts` | Domain mapping + Railway TXT diagnostics |
| `lib/cloudflare/client.ts` | API client (~900 lines) |
| `lib/cloudflare/types.ts` | Types + `CLOUDFLARE_ENV_VARS` |

### UI helpers (in `page.tsx`)

| Helper | Role |
|---|---|
| `FieldValue` | Summary label/value boxes (`break-words`) |
| `EnvVarStatus` | Env var name + Set/Missing badge |
| `LabeledStatusRow` | Status row for email routing |
| `DomainMappingDiagnosticCard` | Apex/www/hooks/webhooks diagnostic card |
| `HelpedCardHeader` | Card title + help dialog |

Layout conventions: [`knowledge-base/guides/cloudflare-settings-ui.md`](../../../knowledge-base/guides/cloudflare-settings-ui.md)

---

## Locked Constraints (operational)

Documentation encodes **hooks subdomain must stay grey cloud** for Cal.com — not enforced in code, but diagnostics should not recommend orange-clouding hooks.

See [`knowledge-base/architecture/cloudflare-integration.md`](../../../knowledge-base/architecture/cloudflare-integration.md)

---

## Environment Variables

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_NAME`, `CLOUDFLARE_ORIGIN_PROVIDER`, `CLOUDFLARE_ORIGIN_TARGET`, `CLOUDFLARE_RAILWAY_TARGET`

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `app/api/admin/cloudflare/__tests__/routes.test.ts` | Route handlers + auth |

---

## Related docs

- [`knowledge-base/architecture/cloudflare-integration.md`](../../../knowledge-base/architecture/cloudflare-integration.md)
- [`knowledge-base/guides/cloudflare-settings-ui.md`](../../../knowledge-base/guides/cloudflare-settings-ui.md)
- [`knowledge-base/architecture/deployment.md`](../../../knowledge-base/architecture/deployment.md)
- [`knowledge-base/guides/locked-business-rules.md`](../../../knowledge-base/guides/locked-business-rules.md)

---

## Risks and Open Questions

- API token scope must be least-privilege but include DNS + rules + email routing.
- Cloudflare API changes may require client updates — types centralized in `types.ts`.
