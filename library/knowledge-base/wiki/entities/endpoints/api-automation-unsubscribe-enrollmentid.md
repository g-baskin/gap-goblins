---
type: entity
title: "GET/POST /api/automation/unsubscribe/[enrollmentId]"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/unsubscribe/[enrollmentId]/route.ts"
language: ts
http_methods:
  - GET
  - POST
route_path: "/api/automation/unsubscribe/[enrollmentId]"
auth_required: false
depends_on:
  - "[[entities/modules/automation-enrollments]]"
  - "[[entities/modules/automation-unsubscribe]]"
used_by:
  - "[[entities/modules/automation-sender]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - api
  - automation
  - unsubscribe
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "app/api/automation/unsubscribe/[enrollmentId]/route.ts"
---

# GET/POST /api/automation/unsubscribe/[enrollmentId]

## Overview

RFC 8058 one-click unsubscribe endpoint for automation emails. Handles both GET (user-click) and POST (mail-client one-click) by routing both to the same `unsubscribe()` internal handler (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:9-21`). Does **not** require admin session — auth is via HMAC token in query string.

## Behavior

1. Extracts `token` from `request.nextUrl.searchParams` (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:29`).
2. Verifies token via `verifyAutomationUnsubscribeToken(enrollmentId, token)` using timing-safe comparison (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:30`). Returns `403` on failure.
3. Fetches enrollment; returns `404` if not found (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:33-40`).
4. Calls `stopEnrollment(id, "one_click_unsubscribe", "unsubscribed")` (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:43`).
5. If subscriber-linked: sets `newsletterSubscribers.unsubscribed = true, unsubscribedAt = now` (`app/api/automation/unsubscribe/[enrollmentId]/route.ts:45-50`).
6. Returns `{ success: true }` at `200`.

## Security note

Token is HMAC-SHA256 over `enrollmentId` using `UNSUBSCRIBE_SECRET ?? AUTH_SECRET`. Timing-safe comparison via `crypto.timingSafeEqual`.

## Connections

- **depends_on:** [[entities/modules/automation-enrollments]], [[entities/modules/automation-unsubscribe]]
- **used_by:** [[entities/modules/automation-sender]] (generates the URL at send time)
- **related:** [[concepts/automation-flow-enrollment]]

## Sources

- `app/api/automation/unsubscribe/[enrollmentId]/route.ts` (lines 1–57)
