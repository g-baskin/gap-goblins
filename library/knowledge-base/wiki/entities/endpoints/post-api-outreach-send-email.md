---
type: entity
entity_type: endpoint
title: "Outreach Manual Send Email"
path: "app/api/outreach/send-email/route.ts"
route_path: /api/outreach/send-email
http_methods:
  - POST
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/send-email/route.ts
    lines: "1-80"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-outreach-sending-sender]]"
related:
  - "[[entities/endpoints/post-api-outreach-process]]"
tags:
  - entity
  - endpoint
  - outreach
  - debug
---

# Outreach Manual Send Email

`POST /api/outreach/send-email` is a manual/debug endpoint that sends a single outreach email for a specific `contactId`, authenticated by `Authorization: Bearer <CRON_SECRET>`. It bypasses the scheduler and blocklist check — intended for testing and support use, not production sending. Returns the Resend message ID on success.
