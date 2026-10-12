---
type: entity
entity_type: endpoint
title: "POST /api/newsletter/send-test"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/newsletter/send-test/route.ts
language: ts
route_path: /api/newsletter/send-test
http_methods:
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/checkRateLimit]]"
  - "[[entities/getClientIp]]"
  - "[[entities/RESEND_API_KEY]]"
  - "[[entities/NEWSLETTER_FROM_EMAIL]]"
related:
  - "[[entities/endpoints/post-api-newsletter-id-send]]"
  - "[[entities/endpoints/get-api-newsletter-health]]"
tags:
  - entity
  - endpoint
  - newsletter
sources:
  - path: app/api/newsletter/send-test/route.ts
    lines: "1-196"
---

# POST /api/newsletter/send-test

## Overview

Sends a hardcoded sample newsletter email to a specified address to verify Resend integration and footer design (`app/api/newsletter/send-test/route.ts:22`). Distinct from `POST /api/newsletter/:id/send?testMode=true` in that it uses a fixed template rather than an existing edition's content — intended purely for configuration smoke testing.

## Signature / Definition

```ts
POST /api/newsletter/send-test
Body: { email: string }  // validated via sendTestSchema (Zod)
Response 200: { message: "Test newsletter sent successfully!" }
```

## Behavior

Dual-layer protection: requires admin or super_admin session AND enforces an IP-based rate limit of 5 emails per hour to prevent a compromised account being used as a relay (`route.ts:37–45`). The unsubscribe URL is safely constructed with `encodeURIComponent` and `escapeHtml` (`route.ts:84–85`) to prevent template injection. Sends via Resend using `RESEND_API_KEY`; returns 500 if the key is unset.

## Connections

- **depends_on:** `checkRateLimit`, `getClientIp`, env vars `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`
- **related:** [[entities/endpoints/post-api-newsletter-id-send]], [[entities/endpoints/get-api-newsletter-health]]

## Sources

- `app/api/newsletter/send-test/route.ts` (lines 1–196)
