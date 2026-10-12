# Admin Authentication

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

NextAuth v5 credentials login, invite-only onboarding, TOTP 2FA, JWT sessions, and session revocation via `passwordChangedAt`.

**Related:**
- [`../architecture/auth-and-security.md`](../architecture/auth-and-security.md)
- [`../api/routes-overview.md`](../api/routes-overview.md)
- [`lib/auth.ts`](../../../lib/auth.ts)
- [`lib/auth.config.ts`](../../../lib/auth.config.ts)
- [`proxy.ts`](../../../proxy.ts)

---

## Overview

Admin access is **invite-only** — no public signup. The first `super_admin` is created via `scripts/create-admin.ts` or SQL (`HANDOFF.md` §5). All `/admin/*` routes except login, invite accept, and password reset require a valid JWT session cookie.

---

## Module split (Edge vs Node)

| Module | Runtime | Responsibility |
|---|---|---|
| `lib/auth.config.ts` | Edge-safe | JWT strategy, pages, session cookie options, empty `providers` |
| `lib/auth.ts` | Node | Credentials provider, bcrypt, TOTP, audit log, JWT revocation check |
| `app/api/auth/[...nextauth]/route.ts` | Node | HTTP handlers from `lib/auth.ts` |
| `proxy.ts` | Edge | `NextAuth(authConfig)` only — never imports `lib/auth.ts` |

`auth.config.ts` documents why providers stay empty at the edge layer:

```72:74:lib/auth.config.ts
  // Providers are intentionally empty here. The full provider list (Credentials)
  // is added in `lib/auth.ts` so middleware never bundles bcryptjs/db/encryption.
  providers: [],
```

---

## Credentials login flow

1. POST to NextAuth with email, password, optional `totpCode`.
2. `authorize()` in `lib/auth.ts` normalizes email, loads `admin_users`, checks `isActive` and `lockedUntil`.
3. Password verified with `bcryptjs` `compare`.
4. If `totpEnabled`, decrypts `totpSecret` (encrypted envelope or legacy plaintext) and validates via `otplib` `verifySync`.
5. On success: reset failed attempts, set `lastLoginAt`, write `admin_audit_log` (`action: login`).
6. Returns user object including `passwordChangedAt` for JWT callback.

Lockout: `MAX_FAILED_LOGIN_ATTEMPTS` / `ACCOUNT_LOCKOUT_DURATION_MS` from `lib/constants.ts`.

---

## Invitation flow

| Step | Location |
|---|---|
| Super admin creates invite | `POST /api/admin/invitations` — `app/api/admin/invitations/route.ts` |
| List invites | `GET /api/admin/invitations` |
| Accept invite (set password) | `POST /api/admin/invitations/accept` — `app/api/admin/invitations/accept/route.ts` |

Invitations stored in `admin_invitations` with expiry (`INVITATION_EXPIRY_MS`). UI: `/admin/invite` (token in query).

Migration `0014_invitation_and_auth_hardening` adds **unique index on `admin_users.email`** after deduplicating rows.

---

## TOTP (2FA)

- Enabled per user on `admin_users.totpEnabled`.
- Secret at `admin_users.totpSecret` — encrypted via `lib/encryption` (`decryptCredential` in `authorize()`).
- Admin API: `/api/admin/security/totp` — enroll, verify, disable.
- Backup codes: `admin_users.backupCodes` (see schema).

---

## JWT session and `passwordChangedAt` revocation

Session strategy: **JWT** (`auth.config.ts`), `maxAge: SESSION_MAX_AGE_SECONDS`.

On login, `authorize()` returns `passwordChangedAt`. The edge-safe JWT callback stores it on the token:

```51:57:lib/auth.config.ts
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.totpEnabled = user.totpEnabled;
        token.passwordChangedAt = user.passwordChangedAt ?? null;
      }
```

Node-side `lib/auth.ts` extends JWT callback to **invalidate sessions** issued before a password change:

```245:261:lib/auth.ts
        const changedAt = userRow?.passwordChangedAt
          ? new Date(userRow.passwordChangedAt).getTime()
          : 0;
        if (changedAt > issuedAt) {
          return {
            ...token,
            exp: 0,
            sub: undefined,
            id: undefined,
          };
        }
```

**Who sets `passwordChangedAt`:**

- Password change: `app/api/admin/security/password/route.ts`
- Reset password: `app/api/admin/security/reset-password/route.ts` (sets `passwordChangedAt: new Date().toISOString()`)
- Revoke all sessions: `app/api/admin/security/sessions/route.ts` bumps `passwordChangedAt` forward (comment documents JWT rejection of older tokens)

---

## Roles

| Role | Typical access |
|---|---|
| `admin` | Standard admin UI and APIs |
| `super_admin` | User invites, destructive settings |

Enforced per-route (e.g. invitations POST requires `super_admin` in `app/api/admin/invitations/route.ts`).

---

## Security endpoints (summary)

| Route | Purpose |
|---|---|
| `/api/admin/security/password` | Change own password |
| `/api/admin/security/reset-password` | Token-based reset |
| `/api/admin/security/totp` | 2FA setup |
| `/api/admin/security/sessions` | List/revoke sessions |

---

## Environment

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | JWT signing |
| `AUTH_COOKIE_DOMAIN` | Optional `.yourdomain.com` for subdomain cookies |
| `INTEGRATION_ENCRYPTION_KEY` | TOTP secret encryption |

---

## Related code

- `lib/auth.ts` — full NextAuth + revocation
- `lib/auth.config.ts` — edge config
- `app/api/admin/invitations/route.ts` — invite CRUD
- `app/api/admin/security/sessions/route.ts` — session revocation
- `proxy.ts` — protects `/admin/*`

---

## Related docs

- [`../architecture/auth-and-security.md`](../architecture/auth-and-security.md) — CSP, CSRF, API keys
- [`../database/schema-and-migrations.md`](../database/schema-and-migrations.md) — migration 0014

---

## Changelog

- v1.0 (2026-05) — JWT, invitations, TOTP, passwordChangedAt revocation.
