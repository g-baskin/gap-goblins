---
type: entity
entity_type: endpoint
title: "Admin User Settings"
path: "app/api/admin/settings/route.ts"
route_path: /api/admin/settings
http_methods:
  - GET
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/settings/route.ts
    lines: "1-200"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-admin-site-settings]]"
tags:
  - entity
  - endpoint
  - admin
  - settings
---

# Admin User Settings

`GET /api/admin/settings` returns the current user's profile (name, jobTitle, avatarUrl) plus their preferences, notifications, and skinId from `admin_settings`. `POST` upserts those values and supports three body shapes: skin-only `{ skinId }`, preferences-only `{ preferences: { theme } }`, or the full settings payload validated by `updateSettingsSchema` (`app/api/admin/settings/route.ts:18-34`). Updates are merged with existing values rather than replaced wholesale.
