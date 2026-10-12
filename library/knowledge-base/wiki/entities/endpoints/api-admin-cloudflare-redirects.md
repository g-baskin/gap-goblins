---
type: entity
entity_type: endpoint
title: "Admin Cloudflare Redirects"
path: "app/api/admin/cloudflare/redirects/route.ts"
route_path: /api/admin/cloudflare/redirects
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
  - path: app/api/admin/cloudflare/redirects/route.ts
    lines: "1-52"
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

# Admin Cloudflare Redirects

`GET /api/admin/cloudflare/redirects` reads the Single Redirect ruleset for a zone via `readCloudflareSingleRedirectRuleset`. `POST` creates or updates the ruleset: the body `mode` field selects between `createCloudflareSingleRedirectRuleset` and `updateCloudflareSingleRedirectRuleset` (`app/api/admin/cloudflare/redirects/route.ts:38-42`). Zone is specified via `zoneName` query param; all mutations require the admin mutation flag.
