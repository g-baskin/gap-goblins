---
type: entity
entity_type: endpoint
title: "Outreach Campaign Schedules"
path: "app/api/outreach/campaigns/[campaignId]/schedules/route.ts"
route_path: /api/outreach/campaigns/[campaignId]/schedules
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
  - path: app/api/outreach/campaigns/[campaignId]/schedules/route.ts
    lines: "1-100"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id-schedules-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaign Schedules

`GET /api/outreach/campaigns/[campaignId]/schedules` lists all schedules for a campaign. `POST` creates a new schedule with fields `sendAt`, `timezone`, `daysOfWeek`, `enabled`; validates that the sendAt time is in the future and that send windows do not overlap with existing schedules (`app/api/outreach/campaigns/[campaignId]/schedules/route.ts:40-95`). Requires admin session.
