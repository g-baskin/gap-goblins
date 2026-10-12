# Feature #005: Admin Auth and Settings (Retroactive)

> **template-crm / admin-platform** — Feature PRD #005
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P0
> **Schema changes:** `admin_users`, `admin_sessions`, `admin_invitations`, `admin_settings`, `admin_audit_log`, `password_reset_tokens`, `site_settings`, `notifications`

---

## Phase Overview

### Problem statement

The platform is admin-only and invite-based. Operators need secure login (password + optional TOTP), user management, theming/branding settings, session visibility, and audit logging — without exposing signup to the public internet.

### Goals (as shipped)

- NextAuth v5 credentials provider with bcrypt passwords.
- TOTP 2FA with backup codes.
- Account lockout after failed attempts.
- Invite-only user provisioning + password reset tokens.
- Per-user settings (theme, skin, timezone, notifications).
- Global site settings (branding).
- In-app notifications bell.
- CSP nonce + CSRF via `proxy.ts`.

### Scope

- `/admin/login`, `/admin/invite/*`, `/admin/reset-password`
- `/admin/settings/*`
- `/api/auth/*`, `/api/admin/*` (security subset)
- `scripts/create-admin.ts` bootstrap CLI

---

## User Flows (as shipped)

1. Super admin created via CLI → logs in at `/admin/login`.
2. Super admin invites user → email with token → accept at `/admin/invite/[token]`.
3. User enables TOTP in Settings → Security → required on subsequent logins.
4. User picks theme/skin in Settings → Appearance persisted to `admin_settings`.
5. User uploads avatar/logo → stored in object storage (feature-007).

---

## Data Model (shipped)

| Table | Role |
|---|---|
| `admin_users` | Accounts, hashes, TOTP, roles |
| `admin_sessions` | Session metadata for security UI |
| `admin_invitations` | Pending invites |
| `admin_settings` | Per-user prefs |
| `admin_audit_log` | Login/logout and admin actions |
| `password_reset_tokens` | Reset flow |
| `site_settings` | Global branding |
| `notifications` | In-app notifications |

---

## API Surface (shipped)

| Area | Paths |
|---|---|
| Auth | `/api/auth/[...nextauth]` |
| Users | `/api/admin/users` |
| Invitations | `/api/admin/invitations`, `accept` |
| Security | `/api/admin/security/password`, `reset-password`, `totp`, `sessions` |
| Settings | `/api/admin/settings`, `/api/admin/site-settings` |
| Dashboard | `/api/admin/dashboard` |
| Notifications | `/api/notifications/*` |

Detail: [`knowledge-base/api/admin-api.md`](../../../knowledge-base/api/admin-api.md)

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(auth)/` | Login, invite, reset pages |
| `app/admin/(dashboard)/settings/` | Settings UI |
| `components/settings/` | Skin picker, sidebar |
| `components/admin/SessionTimeout.tsx` | Idle timeout |
| `components/notifications/` | Bell + sheet |
| `proxy.ts` | Auth gate, CSP, CSRF |
| `lib/auth.ts` | Full NextAuth + credentials |
| `lib/auth.config.ts` | Edge-safe config |
| `lib/security/csp-nonce.ts` | CSP builder |
| `lib/apply-skin.ts` | Colour scheme CSS |
| `lib/theme-user-override.ts` | Client theme persistence |
| `scripts/create-admin.ts` | Bootstrap super_admin |

---

## Locked Constraints

- `proxy.ts` must not import `lib/auth.ts` (Node-only deps)
- CSRF on state-changing `/api/*` from browser
- `/admin/*` requires session except auth pages

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `app/__tests__/security/authentication.test.ts` | Auth flows |
| `app/__tests__/security/rate-limiting.test.ts` | Lockout |
| `lib/auth/__tests__/compare-api-keys.test.ts` | API key timing |
| `app/api/admin/invitations/__tests__/route.test.ts` | Invites |
| `app/api/admin/security/password/__tests__/route.test.ts` | Password change |
| `lib/__tests__/password.test.ts` | Hashing helpers |
| `lib/__tests__/encryption.test.ts` | Credential encryption |
| `lib/__tests__/notifications.test.ts` | Notifications |
| `lib/security/__tests__/input-validation.test.ts` | Validation |

---

## Related docs

- [`knowledge-base/architecture/auth-and-security.md`](../../../knowledge-base/architecture/auth-and-security.md)
- [`knowledge-base/guides/local-development.md`](../../../knowledge-base/guides/local-development.md)

---

## Risks and Open Questions

- No self-service public signup by design — forks may add CLI or signup route.
- Session strategy JWT — see NextAuth config for expiry tuning.
