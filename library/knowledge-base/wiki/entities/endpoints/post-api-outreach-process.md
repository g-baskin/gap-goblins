---
type: entity
entity_type: endpoint
title: "Outreach Process Due Emails"
path: "app/api/outreach/process/route.ts"
route_path: /api/outreach/process
http_methods:
  - GET
  - POST
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/process/route.ts
    lines: "1-290"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-outreach-sending-sender]]"
  - "[[entities/lib-outreach-blocklist]]"
related:
  - "[[entities/endpoints/post-api-outreach-send-email]]"
tags:
  - entity
  - endpoint
  - outreach
  - cron
---

# Outreach Process Due Emails

`GET` and `POST` at `/api/outreach/process` trigger the main outreach sending loop — intended to be called by a cron job or the pg-boss worker, authenticated by `Authorization: Bearer <CRON_SECRET>`. Queries all active campaigns for contacts with `scheduledAt <= now()` that haven't been sent, checks the blocklist, and dispatches emails via Resend (`app/api/outreach/process/route.ts:80-270`). Returns a per-campaign summary of sent, skipped, and failed counts. GET and POST behave identically to support both cron and manual triggers.
