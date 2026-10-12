---
type: entity
entity_type: endpoint
title: "Outreach One-Click Unsubscribe"
path: "app/api/outreach/unsubscribe/[contactId]/route.ts"
route_path: /api/outreach/unsubscribe/[contactId]
http_methods:
  - POST
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/unsubscribe/[contactId]/route.ts
    lines: "1-70"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-outreach-blocklist]]"
related:
  - "[[entities/endpoints/api-outreach-blocklist]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach One-Click Unsubscribe

`POST /api/outreach/unsubscribe/[contactId]` handles RFC 8058 one-click unsubscribe requests. No session required. Sets `outreach_contacts.status = "unsubscribed"` for the given contact and adds their email to the outreach blocklist with source `"unsubscribe"` to prevent future sends (`app/api/outreach/unsubscribe/[contactId]/route.ts:14-65`). Always returns HTTP 200 regardless of whether the contact existed, to avoid enumeration.
