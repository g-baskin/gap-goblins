# Admin API

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

Authenticated admin endpoints: settings, users, security, uploads, dashboard, invitations, and Cloudflare management.

**Related:**
- [`api-overview.md`](api-overview.md)
- [`architecture/auth-and-security.md`](../architecture/auth-and-security.md)
- [`architecture/cloudflare-integration.md`](../architecture/cloudflare-integration.md)

---

## Authentication

All routes require a valid **NextAuth session** unless noted. Mutating requests are CSRF-protected via `proxy.ts`.

Role checks: `super_admin` vs `admin` enforced in handlers (see individual route files).

---

## Settings & site

| Method | Path | Purpose |
|---|---|---|
| GET, PATCH | `/api/admin/settings` | Per-user admin preferences (theme, timezone, notifications) |
| GET, PATCH | `/api/admin/site-settings` | Global branding, logo URLs, site metadata |

---

## Users & invitations

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/admin/users` | List/create admin users |
| GET, POST | `/api/admin/invitations` | Invite flow |
| POST | `/api/admin/invitations/accept` | Accept invite token (public) |

Tests: `app/api/admin/invitations/__tests__/route.test.ts`

---

## Security

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/security/password` | Change password (logged-in) |
| POST | `/api/admin/security/reset-password` | Reset with token |
| GET, POST | `/api/admin/security/totp` | 2FA setup/verify/disable |
| GET, DELETE | `/api/admin/security/sessions` | Session list/revoke |

Tests: `app/api/admin/security/password/__tests__/route.test.ts`

---

## Dashboard

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/dashboard` | Aggregated admin dashboard (uses `get_crm_dashboard_data` RPC where available) |

---

## Uploads

| Method | Path | Purpose |
|---|---|---|
| POST, DELETE | `/api/admin/upload/avatar` | User avatar → object storage |
| POST, DELETE | `/api/admin/upload/logo` | Site logo → object storage |

See [`architecture/storage-and-media.md`](../architecture/storage-and-media.md).

---

## Cloudflare

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/cloudflare/status` | Zone connection status |
| GET | `/api/admin/cloudflare/status/diagnostics` | Extended diagnostics |
| GET, POST, PATCH, DELETE | `/api/admin/cloudflare/dns/records` | DNS CRUD |
| GET, PUT | `/api/admin/cloudflare/redirects` | Redirect ruleset |
| POST | `/api/admin/cloudflare/email/routing/enable` | Enable email routing |
| GET, POST | `/api/admin/cloudflare/email/destinations` | Destination addresses |
| GET, POST, PATCH, DELETE | `/api/admin/cloudflare/email/rules` | Routing rules |

Tests: `app/api/admin/cloudflare/__tests__/routes.test.ts`

---

## Notifications (adjacent)

In-app notifications use `/api/notifications/*` — see `lib/__tests__/notifications.test.ts`.

---

## Related docs

- [`requirements/features/feature-005-admin-auth-and-settings/`](../../requirements/features/feature-005-admin-auth-and-settings/)
- [`requirements/features/feature-006-cloudflare-settings/`](../../requirements/features/feature-006-cloudflare-settings/)

---

## Changelog

- v1.0 (2026-05) — Initial admin API reference.
