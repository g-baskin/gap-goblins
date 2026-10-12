---
type: entity
entity_type: endpoint
title: "Outreach Replies SSE Stream"
path: "app/api/outreach/replies/stream/route.ts"
route_path: /api/outreach/replies/stream
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/replies/stream/route.ts
    lines: "1-80"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-replies]]"
tags:
  - entity
  - endpoint
  - outreach
  - sse
---

# Outreach Replies SSE Stream

`GET /api/outreach/replies/stream` opens a Server-Sent Events connection that polls `outreach_replies` every 5 seconds for rows newer than the last seen `createdAt` timestamp and pushes them as `data: <json>` events (`app/api/outreach/replies/stream/route.ts:22-74`). The connection stays open until the client disconnects. Requires admin session. Used by the inbox UI to receive real-time reply notifications without polling the REST endpoint.
