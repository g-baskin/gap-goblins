---
type: entity
entity_type: endpoint
title: "Outreach Campaign Performance"
path: "app/api/outreach/campaigns/[campaignId]/performance/route.ts"
route_path: /api/outreach/campaigns/[campaignId]/performance
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/campaigns/[campaignId]/performance/route.ts
    lines: "1-100"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaign Performance

`GET /api/outreach/campaigns/[campaignId]/performance` returns per-day metrics (sent, opened, clicked, replied) for the campaign over a date range specified via `from` and `to` query params. Results are bucketed by day using SQL `date_trunc`. Also returns campaign-lifetime aggregates and per-contact-stage funnel counts (`app/api/outreach/campaigns/[campaignId]/performance/route.ts:27-95`). Requires admin session.
