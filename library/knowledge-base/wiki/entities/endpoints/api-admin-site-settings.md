---
type: entity
entity_type: endpoint
title: "Admin Site Settings"
path: "app/api/admin/site-settings/route.ts"
route_path: /api/admin/site-settings
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
  - path: app/api/admin/site-settings/route.ts
    lines: "1-134"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-branding-sync-newsletter-branding]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/post-api-admin-branding-import-from-website]]"
  - "[[entities/endpoints/api-admin-settings]]"
tags:
  - entity
  - endpoint
  - admin
  - settings
  - branding
---

# Admin Site Settings

`GET /api/admin/site-settings` returns the `site_settings` row with id `"default"`. `POST` performs a partial upsert of that row, preserving any field not present in the body (`app/api/admin/site-settings/route.ts:44-48`). When branding fields (businessName, senderName, primaryColor, logoUrl, website, address) are touched, `syncNewsletterBranding` is called to propagate them to newsletter settings (`app/api/admin/site-settings/route.ts:100-127`).
