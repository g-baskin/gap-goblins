---
type: entity
entity_type: endpoint
title: "Outreach Service Health Check"
path: "app/api/outreach/health/route.ts"
route_path: /api/outreach/health
http_methods:
  - GET
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/health/route.ts
    lines: "1-60"
depends_on:
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/get-api-health]]"
tags:
  - entity
  - endpoint
  - outreach
  - health
---

# Outreach Service Health Check

`GET /api/outreach/health` verifies the presence of required outreach environment variables (Resend key, sender config) and performs a lightweight database reachability check. Returns `{ status: "ok" | "degraded", checks: { env, db } }`. No authentication required — intended for uptime monitors and Railway health probes.
