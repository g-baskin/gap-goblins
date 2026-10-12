---
type: entity
entity_type: endpoint
title: "System Health Check"
path: "app/api/health/route.ts"
route_path: /api/health
http_methods:
  - GET
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/health/route.ts
    lines: "1-131"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-logger]]"
  - "[[entities/lib-newsletter-queue]]"
related: []
tags:
  - entity
  - endpoint
  - health
---

# System Health Check

`GET /api/health` returns a lightweight `{ status, timestamp }` response for unauthenticated uptime monitors (HTTP 200 when the database is reachable, 503 when not). When called with a `Bearer <CRON_SECRET>` `Authorization` header it returns a detailed payload covering database connectivity, newsletter queue health, and environment-variable presence (`app/api/health/route.ts:28-131`). The endpoint is safe to call without session credentials; sensitive detail is gated behind the cron secret, preventing information leakage to anonymous callers.
