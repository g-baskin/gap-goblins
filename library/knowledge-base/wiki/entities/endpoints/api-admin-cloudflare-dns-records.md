---
type: entity
entity_type: endpoint
title: "Admin Cloudflare DNS Records"
path: "app/api/admin/cloudflare/dns/records/route.ts"
route_path: /api/admin/cloudflare/dns/records
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
  - path: app/api/admin/cloudflare/dns/records/route.ts
    lines: "1-54"
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

# Admin Cloudflare DNS Records

`GET /api/admin/cloudflare/dns/records` lists DNS records for a zone (query param `zoneName`) via `listCloudflareDnsRecords`. `POST` creates or updates a record: if an `id` is included in the body it calls `updateCloudflareDnsRecord`, otherwise `createCloudflareDnsRecord` (`app/api/admin/cloudflare/dns/records/route.ts:30-43`). Both methods require admin session and Cloudflare credentials; mutations additionally require `{ mutation: true }` check via `requireCloudflareAdmin`.
