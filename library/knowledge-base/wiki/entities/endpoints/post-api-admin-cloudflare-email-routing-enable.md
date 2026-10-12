---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Email Routing Enable"
path: "app/api/admin/cloudflare/email/routing/enable/route.ts"
route_path: /api/admin/cloudflare/email/routing/enable
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/cloudflare/email/routing/enable/route.ts
    lines: "1-33"
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

# Admin Cloudflare Email Routing Enable

`POST /api/admin/cloudflare/email/routing/enable` activates Cloudflare Email Routing for a zone by calling `enableCloudflareEmailRouting` (`app/api/admin/cloudflare/email/routing/enable/route.ts:12-33`). Zone is identified via the `zoneName` query parameter. The endpoint requires admin session with mutation permissions.
