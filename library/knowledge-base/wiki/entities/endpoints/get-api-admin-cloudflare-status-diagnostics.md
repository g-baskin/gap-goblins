---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Status Diagnostics"
path: "app/api/admin/cloudflare/status/diagnostics/route.ts"
route_path: /api/admin/cloudflare/status/diagnostics
http_methods:
  - GET
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/cloudflare/status/diagnostics/route.ts
    lines: "1-15"
depends_on:
  - "[[entities/api-admin-cloudflare-lib-route-helpers]]"
  - "[[entities/api-admin-cloudflare-lib-schemas]]"
  - "[[entities/api-admin-cloudflare-lib-status]]"
related:
  - "[[entities/endpoints/get-api-admin-cloudflare-status]]"
tags:
  - entity
  - endpoint
  - admin
  - cloudflare
---

# Admin Cloudflare Status Diagnostics

`GET /api/admin/cloudflare/status/diagnostics` returns a detailed Cloudflare status payload via `buildCloudflareStatusPayload` (`app/api/admin/cloudflare/status/diagnostics/route.ts:7-14`). This route is a sibling of the root status endpoint but lives one level deeper under `/diagnostics`, suggesting it may expose additional diagnostic detail. Requires admin session and zone name query param.
