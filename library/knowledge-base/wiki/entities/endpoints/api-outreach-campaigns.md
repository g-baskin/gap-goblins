---
type: entity
entity_type: endpoint
title: "Outreach Campaigns List / Create"
path: "app/api/outreach/campaigns/route.ts"
route_path: /api/outreach/campaigns
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
  - path: app/api/outreach/campaigns/route.ts
    lines: "1-170"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaigns List / Create

`GET /api/outreach/campaigns` returns paginated outreach campaigns with optional `status`, `search`, and `tags` filters and per-campaign aggregate stats (totalContacts, sent, replied). `POST` creates a campaign from `createCampaignSchema` data including subject template, body template, optional initial schedules, and sender account IDs (`app/api/outreach/campaigns/route.ts:92-162`). Requires admin session.
