---
type: entity
entity_type: endpoint
title: "Admin Newsletter Subscribers"
path: "app/api/admin/subscribers/route.ts"
route_path: /api/admin/subscribers
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
  - path: app/api/admin/subscribers/route.ts
    lines: "1-170"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-newsletter-subscribers]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - newsletter
---

# Admin Newsletter Subscribers

`GET /api/admin/subscribers` returns a paginated, searchable list of newsletter subscribers with `page`, `limit`, `search`, and `filter` (all/verified/unsubscribed) query params. Restricted to admin/super_admin roles. `POST` manually adds a subscriber from the admin panel using `createOrRefreshPendingSubscriber` and optionally sends a double opt-in confirmation email unless `skip_confirmation: true` is provided (`app/api/admin/subscribers/route.ts:120-169`). Subscriber source is set to `"admin_manual"`.
