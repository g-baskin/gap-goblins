# API Overview

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

HTTP API conventions for template-crm: authentication modes, response shapes, and camelCase ↔ snake_case mapping.

**Related:**
- [`architecture/auth-and-security.md`](../architecture/auth-and-security.md)
- [`app/api/`](../../../app/api/)

---

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:3500` |
| Production | `https://__YOUR_DOMAIN__` or Railway `*.up.railway.app` |
| Webhooks (Cal) | `https://hooks.__YOUR_DOMAIN__` (grey-cloud only) |

All routes live under `app/api/**/route.ts` (Next.js App Router Route Handlers).

---

## Authentication modes

| Mode | Used for | How |
|---|---|---|
| **NextAuth session** | Admin UI + most `/api/admin/*`, `/api/crm/*` | Cookie session; CSRF on mutating requests |
| **Webhook signature** | Cal.com, Resend | HMAC / Svix verification |
| **API key / Bearer** | Newsletter automation, outreach cron, some internal routes | `compareApiKeys` / `compareBearerToken` |
| **Cron secret** | `/api/cron/*` | `Authorization: Bearer CRON_SECRET` |
| **Public** | Health, newsletter subscribe/verify/unsubscribe, automation unsubscribe (signed URL) | None, optional `x-api-key`, or signed token |

Unauthenticated routes still use `db` directly (server-side) — no RLS layer.

---

## Response conventions

- **Success:** JSON body; HTTP 200/201/202 as appropriate.
- **Errors:** `{ error: string }` or structured `{ code, message }` depending on route age.
- **Pagination:** TanStack table APIs often return `{ data, total, page }` — check per-route tests.

### camelCase vs snake_case

| Layer | Convention |
|---|---|
| Drizzle schema / queries | camelCase (`firstName`, `createdAt`) |
| PostgreSQL columns | snake_case (`first_name`, `created_at`) |
| Some API JSON responses | snake_case for legacy clients |
| TypeScript handlers | camelCase internally; map at boundary |

**Anti-pattern:** Using snake_case in Drizzle `.where()` clauses — always camelCase property names.

Drizzle throws on error — use `try/catch`, not Supabase `{ data, error }` pattern.

---

## Route map (by prefix)

Full per-route index: [`routes-overview.md`](routes-overview.md).

| Prefix | Doc | Auth |
|---|---|---|
| `/api/auth/*` | NextAuth handlers | Public (login) |
| `/api/admin/*` | [`admin-api.md`](admin-api.md) | Session |
| `/api/crm/*` | [`crm-api.md`](crm-api.md) | Session |
| `/api/outreach/*` | [`outreach-api.md`](outreach-api.md) | Session + keys for automation |
| `/api/newsletter/*` | [`newsletter-api.md`](newsletter-api.md) | Session + API key |
| `/api/webhooks/*` | [`webhooks-and-cron.md`](webhooks-and-cron.md) | Signatures |
| `/api/cron/*` | [`webhooks-and-cron.md`](webhooks-and-cron.md) | Cron secret |
| `/api/media/*` | [`architecture/storage-and-media.md`](../architecture/storage-and-media.md) | Session |
| `/api/health` | Liveness | Public |

---

## CSRF (mutating API from browser)

`proxy.ts` validates `Origin` / `Referer` for `POST`, `PUT`, `DELETE`, `PATCH` on `/api/*`.

Server-to-server callers must send matching origin headers or call from excluded webhook/import paths.

---

## Shared helpers

- `lib/api/parse-request-json.ts` — safe JSON body parsing
- `lib/auth/compare-api-keys.ts` — timing-safe key compare
- `lib/logger.ts` — structured logging (pino)

---

## Testing

API route tests live beside handlers: `app/api/**/__tests__/route.test.ts`.

Run: `bun run test:run`

---

## Changelog

- v1.0 (2026-05) — Initial API overview.
