---
type: entity
entity_type: endpoint
title: "Admin Upload Logo"
path: "app/api/admin/upload/logo/route.ts"
route_path: /api/admin/upload/logo
http_methods:
  - POST
  - DELETE
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/admin/upload/logo/route.ts
    lines: "1-130"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-storage]]"
related:
  - "[[entities/endpoints/api-admin-upload-avatar]]"
tags:
  - entity
  - endpoint
  - admin
  - upload
  - branding
---

# Admin Upload Logo

`POST /api/admin/upload/logo` accepts PNG/JPG/WebP/SVG up to 2 MB. SVG files lack magic bytes so the code validates the content by checking for `<svg` markup in the first 512 bytes (`app/api/admin/upload/logo/route.ts:46-60`). The file is stored under `logos/` in S3 and the previous logo is deleted best-effort. The response returns the `/api/media/logos/…` proxy URL upserted into `site_settings.logoUrl`. `DELETE` removes the current logo and nulls the field.
