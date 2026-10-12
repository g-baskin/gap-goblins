---
type: entity
entity_type: endpoint
title: "Admin Upload Avatar"
path: "app/api/admin/upload/avatar/route.ts"
route_path: /api/admin/upload/avatar
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
  - path: app/api/admin/upload/avatar/route.ts
    lines: "1-100"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-storage]]"
related:
  - "[[entities/endpoints/api-admin-upload-logo]]"
tags:
  - entity
  - endpoint
  - admin
  - upload
---

# Admin Upload Avatar

`POST /api/admin/upload/avatar` accepts a `multipart/form-data` upload with a `file` field (PNG/JPG/WebP, max 2 MB). Magic-byte detection via `fileTypeFromBuffer` validates the MIME type before storing to S3 under the `avatars/` prefix (`app/api/admin/upload/avatar/route.ts:40-53`). The previous avatar is deleted best-effort. The response contains the internal `/api/media/avatars/…` proxy URL which is persisted to `admin_users.avatarUrl`. `DELETE` removes the current avatar from storage and clears the database field.
