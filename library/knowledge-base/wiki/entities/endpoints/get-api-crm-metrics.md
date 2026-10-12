---
type: entity
entity_type: endpoint
title: "CRM Metrics"
path: "app/api/crm/metrics/route.ts"
route_path: /api/crm/metrics
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/crm/metrics/route.ts
    lines: "1-90"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-crm-metrics]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/get-api-admin-dashboard]]"
tags:
  - entity
  - endpoint
  - crm
---

# CRM Metrics

`GET /api/crm/metrics` returns aggregate CRM statistics: total contacts, new contacts (last 30 days), contacts by status, total deal value, deals by stage, and conversion rates. Delegates to `getCrmMetrics` from `lib/crm/metrics` (`app/api/crm/metrics/route.ts:6-18`). Requires admin session.
