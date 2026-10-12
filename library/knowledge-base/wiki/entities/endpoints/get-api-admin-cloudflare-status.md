---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Status"
path: "app/api/admin/cloudflare/status/route.ts"
route_path: /api/admin/cloudflare/status
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/cloudflare/status/route.ts
    lines: "1-15"
depends_on:
  - "[[entities/api-admin-cloudflare-lib-route-helpers]]"
  - "[[entities/api-admin-cloudflare-lib-schemas]]"
  - "[[entities/api-admin-cloudflare-lib-status]]"
related:
  - "[[entities/endpoints/get-api-admin-cloudflare-status-diagnostics]]"
tags:
  - entity
  - endpoint
  - admin
  - cloudflare
---

# Admin Cloudflare Status

`GET /api/admin/cloudflare/status` returns the Cloudflare zone status summary built by `buildCloudflareStatusPayload` (`app/api/admin/cloudflare/status/route.ts:7-14`). Requires admin session; zone name is passed via query param. This is the top-level status summary endpoint; the `/diagnostics` child route provides the same payload at a deeper path.
