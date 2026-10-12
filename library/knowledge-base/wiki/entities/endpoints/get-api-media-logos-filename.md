---
type: entity
entity_type: endpoint
title: "GET /api/media/logos/:filename"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/media/logos/[filename]/route.ts
language: ts
route_path: /api/media/logos/:filename
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/downloadFile]]"
related:
  - "[[entities/endpoints/get-api-media-avatars-filename]]"
tags:
  - entity
  - endpoint
  - media
sources:
  - path: app/api/media/logos/[filename]/route.ts
    lines: "1-43"
---

# GET /api/media/logos/:filename

## Overview

Authenticated proxy that serves organisation/brand logo images from S3-compatible storage (`app/api/media/logos/[filename]/route.ts:7`). Structurally identical to the avatars endpoint but serves from the `logos/` prefix and additionally supports SVG files. Returns files with `Cache-Control: private, max-age=3600`.

## Signature / Definition

```ts
GET /api/media/logos/:filename
Response: Blob with Content-Type header (image/png | image/jpeg | image/webp | image/svg+xml)
```

## Behavior

Filename validated with `FILENAME_PATTERN` (`/^[\w.-]+$/`, `route.ts:5`). Calls `downloadFile('logos/<filename>')` (`route.ts:22`). Supports an additional `svg: "image/svg+xml"` content-type mapping compared to the avatars endpoint (`route.ts:30–34`). Returns 400, 401, and 404 for invalid filename, unauthenticated, and missing file respectively.

## Connections

- **depends_on:** `downloadFile` (`lib/storage`)
- **related:** [[entities/endpoints/get-api-media-avatars-filename]]

## Sources

- `app/api/media/logos/[filename]/route.ts` (lines 1–43)
