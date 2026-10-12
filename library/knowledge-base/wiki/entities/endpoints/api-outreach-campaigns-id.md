---
type: entity
entity_type: endpoint
title: "Outreach Single Campaign"
path: "app/api/outreach/campaigns/[campaignId]/route.ts"
route_path: /api/outreach/campaigns/[campaignId]
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
  - path: app/api/outreach/campaigns/[campaignId]/route.ts
    lines: "1-280"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns]]"
  - "[[entities/endpoints/get-api-outreach-campaigns-id-performance]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Single Campaign

`GET /api/outreach/campaigns/[campaignId]` returns the campaign with its contacts (page/limit/search/status filters), schedules, sender accounts, and aggregate stats. `PATCH` updates campaign fields (name, status, tags, subject, body, settings) including pausing/resuming logic. `DELETE` removes the campaign and cascades to contacts and schedules (`app/api/outreach/campaigns/[campaignId]/route.ts:202-278`). Requires admin session.
