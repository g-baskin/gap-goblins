---
type: entity
entity_type: endpoint
title: "Admin Branding Import from Website"
path: "app/api/admin/branding/import-from-website/route.ts"
route_path: /api/admin/branding/import-from-website
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/branding/import-from-website/route.ts
    lines: "1-148"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-branding-extract-from-url]]"
  - "[[entities/lib-branding-import-remote-logo]]"
  - "[[entities/lib-branding-sync-newsletter-branding]]"
  - "[[entities/lib-db]]"
related: []
tags:
  - entity
  - endpoint
  - admin
  - branding
---

# Admin Branding Import from Website

`POST /api/admin/branding/import-from-website` scrapes a given URL for brand data (business name, primary colour, logo) using `extractBrandingFromUrl` and, when `apply: true` is in the body, persists the result to `site_settings` and syncs it to newsletter settings (`app/api/admin/branding/import-from-website/route.ts:12-148`). Without `apply` the endpoint returns a preview object only. Logo images are downloaded and stored via `importRemoteLogo`; the stored URL is the internal `/api/media/logos/…` proxy path, never a raw S3 URL.
