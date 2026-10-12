---
type: entity
entity_type: endpoint
title: "Outreach Single Reply"
path: "app/api/outreach/replies/[replyId]/route.ts"
route_path: /api/outreach/replies/[replyId]
http_methods:
  - GET
  - PATCH
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/replies/[replyId]/route.ts
    lines: "1-230"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-crm-contacts]]"
related:
  - "[[entities/endpoints/api-outreach-replies]]"
  - "[[entities/endpoints/post-api-outreach-replies-id-send]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Single Reply

`GET /api/outreach/replies/[replyId]` returns the reply row with joined contact, campaign, and full admin reply thread. `PATCH` updates reply metadata — primarily `isRead`, `isArchived`, and `crmPushed`; when `crmPushed: true` is set it attempts to move the associated CRM deal to the "Contacted" stage (`app/api/outreach/replies/[replyId]/route.ts:90-198`). Requires admin session.
