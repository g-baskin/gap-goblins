---
type: entity
entity_type: endpoint
title: "Outreach Campaign Tags"
path: "app/api/outreach/campaigns/tags/route.ts"
route_path: /api/outreach/campaigns/tags
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/campaigns/tags/route.ts
    lines: "1-40"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaign Tags

`GET /api/outreach/campaigns/tags` returns a deduplicated, sorted list of all tags currently assigned to any outreach campaign, used to populate the tag autocomplete in the campaign filter UI. The query unnests the JSON `tags` column via Postgres `json_array_elements_text` (`app/api/outreach/campaigns/tags/route.ts:12-37`). Requires admin session.
