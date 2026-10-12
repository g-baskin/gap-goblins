# Login 2FA Follow-up

The credentials provider in `lib/auth.ts` enforces TOTP when `admin_users.totp_enabled` is true and expects a `totpCode` credential.

The current login form at `app/admin/(auth)/login/page.tsx` only sends `email` and `password` to `signIn("credentials", ...)`, so users with TOTP enabled fail login without seeing a 2FA prompt.

Follow-up work:

- Add a 2FA code input to the admin login flow when credentials are valid but TOTP is required.
- Submit `totpCode` to `signIn("credentials", ...)`.
- Preserve the generic login error behaviour enough to avoid user enumeration.
- Add a regression test or interaction check for TOTP-enabled admin login.

Local note from 2026-05-28: `superadmin@localhost.com` had TOTP disabled manually in the local database so password reset login could proceed while this UI gap exists.
