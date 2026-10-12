---
type: entity
entity_type: endpoint
title: "PATCH /api/notifications/:id/read"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/notifications/[id]/read/route.ts
language: ts
route_path: /api/notifications/:id/read
http_methods:
  - PATCH
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/notifications]]"
related:
  - "[[entities/endpoints/post-api-notifications-mark-all-read]]"
  - "[[entities/endpoints/get-api-notifications]]"
tags:
  - entity
  - endpoint
  - notifications
sources:
  - path: app/api/notifications/[id]/read/route.ts
    lines: "1-35"
---

# PATCH /api/notifications/:id/read

## Overview

Marks a single notification as read by setting `isRead: true` and recording a `readAt` timestamp (`app/api/notifications/[id]/read/route.ts:7`). Ownership-scoped: the query includes `eq(notifications.userId, session.user.id)` to prevent one user reading another's notifications. Note: the exported handler name is `PATCH` despite the task-assigned filename prefix.

## Signature / Definition

```ts
PATCH /api/notifications/:id/read
Response: { success: true }
```

## Behavior

Fetches the notification first with `AND userId = session.user.id` (`route.ts:15–19`) to verify ownership; returns 404 if not found. Then updates `isRead = true` and `readAt = now()` (`route.ts:26–29`). Returns 500 on database error. No request body is expected or consumed.

## Connections

- **depends_on:** `notifications` (schema table)
- **related:** [[entities/endpoints/post-api-notifications-mark-all-read]], [[entities/endpoints/get-api-notifications]]

## Sources

- `app/api/notifications/[id]/read/route.ts` (lines 1–35)
