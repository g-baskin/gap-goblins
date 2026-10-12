---
type: entity
entity_type: endpoint
title: "POST /api/notifications/mark-all-read"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/notifications/mark-all-read/route.ts
language: ts
route_path: /api/notifications/mark-all-read
http_methods:
  - POST
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/notifications]]"
related:
  - "[[entities/endpoints/post-api-notifications-id-read]]"
  - "[[entities/endpoints/get-api-notifications]]"
tags:
  - entity
  - endpoint
  - notifications
sources:
  - path: app/api/notifications/mark-all-read/route.ts
    lines: "1-26"
---

# POST /api/notifications/mark-all-read

## Overview

Bulk-marks all unread notifications for the authenticated user as read in a single database UPDATE (`app/api/notifications/mark-all-read/route.ts:7`). Scoped to the current user via `eq(notifications.userId, session.user.id)` combined with `eq(notifications.isRead, false)` to avoid touching already-read rows.

## Signature / Definition

```ts
POST /api/notifications/mark-all-read
Response: { success: true }
```

## Behavior

No request body is consumed. Performs a single `db.update(notifications).set({ isRead: true, readAt: now() }).where(userId = me AND isRead = false)` (`route.ts:14–17`). Returns 401 if unauthenticated and 500 on database error. Idempotent — calling when there are no unread notifications is a no-op.

## Connections

- **depends_on:** `notifications` (schema table)
- **related:** [[entities/endpoints/post-api-notifications-id-read]], [[entities/endpoints/get-api-notifications]]

## Sources

- `app/api/notifications/mark-all-read/route.ts` (lines 1–26)
