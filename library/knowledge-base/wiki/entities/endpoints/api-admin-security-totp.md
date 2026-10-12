---
type: entity
entity_type: endpoint
title: "Admin Security TOTP"
path: "app/api/admin/security/totp/route.ts"
route_path: /api/admin/security/totp
http_methods:
  - GET
  - POST
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/security/totp/route.ts
    lines: "1-254"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-encryption]]"
  - "[[entities/lib-rate-limit]]"
  - "[[entities/lib-validations]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - security
  - totp
---

# Admin Security TOTP

Full TOTP lifecycle endpoint. `GET` generates a new TOTP secret and returns an `otpauth://` URI for QR-code display (`app/api/admin/security/totp/route.ts:13-52`). `POST { secret, token }` verifies the first TOTP code then stores the secret AES-encrypted in `admin_users.totpSecret` (`app/api/admin/security/totp/route.ts:56-148`). `DELETE { token }` decrypts the stored secret, verifies the code, and clears TOTP (`app/api/admin/security/totp/route.ts:152-253`). Rate-limited to 5 requests/hour via `totpSetup` limiter. Handles legacy plaintext secrets alongside the encrypted envelope format.
