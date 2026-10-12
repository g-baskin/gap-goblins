---
type: entity
entity_type: endpoint
title: "Outreach Campaign Single Schedule"
path: "app/api/outreach/campaigns/[campaignId]/schedules/[scheduleId]/route.ts"
route_path: /api/outreach/campaigns/[campaignId]/schedules/[scheduleId]
http_methods:
  - GET
  - PATCH
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/campaigns/[campaignId]/schedules/[scheduleId]/route.ts
    lines: "1-130"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id-schedules]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaign Single Schedule

`GET`, `PATCH`, and `DELETE` on a specific schedule within a campaign. The PATCH updates schedule fields such as `sendAt`, `timezone`, and `daysOfWeek`; the schedule is re-validated to ensure it doesn't overlap with other active schedules for the campaign. DELETE removes the schedule row; campaigns with no remaining schedules are automatically paused (`app/api/outreach/campaigns/[campaignId]/schedules/[scheduleId]/route.ts:80-127`). Requires admin session.
