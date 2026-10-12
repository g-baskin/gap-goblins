---
type: entity
title: "proxy (Next.js request proxy)"
entity_type: module
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "proxy.ts"
language: ts
depends_on:
  - "[[entities/modules/auth-config]]"
  - "[[entities/functions/generateNonce]]"
  - "[[entities/functions/buildCspHeader]]"
used_by: []
last_commit_hash: "54b4276b10c47fd6e7f61a071192fbefbb1cc075"
tested_by: []
tags:
  - entity
  - infrastructure
  - auth
related:
  - "[[concepts/nextauth-proxy-split]]"
  - "[[concepts/cal-webhook-hooks-subdomain]]"
sources:
  - "proxy.ts"
---

# proxy (Next.js request proxy)

## Overview

`proxy.ts` is the Next.js 16 edge proxy entry point (`export const proxy`). It wraps requests with NextAuth session checks, CSP nonce injection, CSRF origin validation for state-changing API calls, and a webhook-host lockdown that returns 404 for non-webhook paths on `hooks.*` / `webhooks.*` hostnames (`proxy.ts:41-65`).

## Signature / Definition

Exports `proxy` (NextAuth middleware callback) and `config.matcher` for route matching (`proxy.ts:41-141`).

## Behavior

- Instantiates NextAuth from Edge-safe `authConfig` only — never imports `lib/auth.ts` (`proxy.ts:6-9`).
- Injects CSP nonce via `nextWithCsp` on allowed responses (`proxy.ts:16-29`, `proxy.ts:107-127`).
- Blocks `hooks.*` / `webhooks.*` hostnames except webhook routes excluded from matcher (`proxy.ts:60-65`, `proxy.ts:130-141`).
- CSRF: rejects POST/PUT/DELETE/PATCH on `/api/*` when Origin/Referer mismatch (`proxy.ts:70-97`).
- Admin routes require login; auth pages redirect logged-in users away from login (`proxy.ts:100-125`).

## Connections

- **depends_on:** [[entities/modules/auth-config]], CSP helpers
- **related concepts:** [[concepts/nextauth-proxy-split]], [[concepts/cal-webhook-hooks-subdomain]]

## Tested by

- `app/__tests__/security/authentication.test.ts` (indirect)

## History

- **Last touched:** `54b4276` — fix admin auth redirects (2026-05-27)
- **Created:** `40438e4` — Next.js 16 proxy migration from middleware.ts (2026-05-27)

## Sources

- `proxy.ts` (lines 1–141)
