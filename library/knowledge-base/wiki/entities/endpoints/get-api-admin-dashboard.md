---
type: entity
entity_type: endpoint
title: "Admin Dashboard Aggregates"
path: "app/api/admin/dashboard/route.ts"
route_path: /api/admin/dashboard
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/dashboard/route.ts
    lines: "1-520"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-crm-metrics]]"
  - "[[entities/lib-db]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - dashboard
---

# Admin Dashboard Aggregates

`GET /api/admin/dashboard` executes 14 parallel queries via `Promise.all` and assembles a single `DashboardData` object covering KPIs, pipeline stages, newsletter stats, outreach campaign stats, email intelligence, recent activity, source attribution, and top UTM campaigns (`app/api/admin/dashboard/route.ts:100-271`). Restricted to `admin` and `super_admin` roles. The response is cache-controlled with `private, max-age=30, stale-while-revalidate=60` to limit database load from rapid UI refreshes.
