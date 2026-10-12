---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Email Routing Rules"
path: "app/api/admin/cloudflare/email/rules/route.ts"
route_path: /api/admin/cloudflare/email/rules
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
  - path: app/api/admin/cloudflare/email/rules/route.ts
    lines: "1-56"
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

# Admin Cloudflare Email Routing Rules

`GET /api/admin/cloudflare/email/rules` lists Email Routing rules for a zone via `listCloudflareEmailRoutingRules`. `POST` creates a new routing rule via `createCloudflareEmailRoutingRule` (`app/api/admin/cloudflare/email/rules/route.ts:29-55`). The zone is supplied via the `zoneName` query parameter; mutations require the admin mutation flag.
