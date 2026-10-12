---
type: entity
entity_type: endpoint
title: "Outreach Replies List"
path: "app/api/outreach/replies/route.ts"
route_path: /api/outreach/replies
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/replies/route.ts
    lines: "1-130"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-replies-id]]"
  - "[[entities/endpoints/get-api-outreach-replies-stream]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Replies List

`GET /api/outreach/replies` returns paginated inbound outreach reply threads with filters: `isRead`, `isArchived`, `campaignId`, `search` (contact name/email), `page`, and `limit`. Each item includes the contact name, campaign name, latest reply body preview, and unread count (`app/api/outreach/replies/route.ts:22-112`). Requires admin session.
