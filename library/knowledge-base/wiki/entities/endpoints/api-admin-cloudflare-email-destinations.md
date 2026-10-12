---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Email Destinations"
path: "app/api/admin/cloudflare/email/destinations/route.ts"
route_path: /api/admin/cloudflare/email/destinations
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
  - path: app/api/admin/cloudflare/email/destinations/route.ts
    lines: "1-45"
depends_on:
  - "[[entities/lib-cloudflare-client]]"
  - "[[entities/api-admin-cloudflare-lib-route-helpers]]"
  - "[[entities/api-admin-cloudflare-lib-schemas]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - cloudflare
---

# Admin Cloudflare Email Destinations

`GET /api/admin/cloudflare/email/destinations` lists Cloudflare Email Routing destination addresses for a given zone. `POST` creates a new destination address via `createCloudflareEmailDestinationAddress` (`app/api/admin/cloudflare/email/destinations/route.ts:27-44`). Both methods gate access behind `requireCloudflareAdmin`; the POST variant additionally requires the mutation flag.
