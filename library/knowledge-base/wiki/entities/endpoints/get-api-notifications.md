---
type: entity
entity_type: endpoint
title: "GET /api/notifications"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/notifications/route.ts
language: ts
route_path: /api/notifications
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/notifications]]"
related:
  - "[[entities/endpoints/post-api-notifications-id-read]]"
  - "[[entities/endpoints/post-api-notifications-mark-all-read]]"
tags:
  - entity
  - endpoint
  - notifications
sources:
  - path: app/api/notifications/route.ts
    lines: "1-27"
---

# GET /api/notifications

## Overview

Lists all notifications for the authenticated user, up to 50, ordered by `createdAt` descending (`app/api/notifications/route.ts:7`). Returns both the full notification rows and a computed `unreadCount` derived client-side from the result set without an additional COUNT query.

## Signature / Definition

```ts
GET /api/notifications
Response: { notifications: Notification[], unreadCount: number }
```

## Behavior

Queries `notifications WHERE userId = session.user.id ORDER BY createdAt DESC LIMIT 50` (`route.ts:14–18`). `unreadCount` is calculated with `rows.filter(n => !n.isRead).length` in memory (`route.ts:21`) — accurate only up to the 50-row limit. Returns 401 if unauthenticated and 500 on database error.

## Connections

- **depends_on:** `notifications` (schema table)
- **related:** [[entities/endpoints/post-api-notifications-id-read]], [[entities/endpoints/post-api-notifications-mark-all-read]]

## Sources

- `app/api/notifications/route.ts` (lines 1–27)
