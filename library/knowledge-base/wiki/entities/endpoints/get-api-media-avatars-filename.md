---
type: entity
entity_type: endpoint
title: "GET /api/media/avatars/:filename"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: app/api/media/avatars/[filename]/route.ts
language: ts
route_path: /api/media/avatars/:filename
http_methods:
  - GET
auth_required: true
last_commit_hash: "91aec3d"
depends_on:
  - "[[entities/downloadFile]]"
related:
  - "[[entities/endpoints/get-api-media-logos-filename]]"
tags:
  - entity
  - endpoint
  - media
sources:
  - path: app/api/media/avatars/[filename]/route.ts
    lines: "1-42"
---

# GET /api/media/avatars/:filename

## Overview

Authenticated proxy that serves user avatar images from S3-compatible storage (`app/api/media/avatars/[filename]/route.ts:7`). Validates the filename against a strict allowlist regex (`/^[\w.-]+$/`) before fetching, ensuring only safe alphanumeric filenames with dots and hyphens are accepted. Files are served with `Cache-Control: private, max-age=3600`.

## Signature / Definition

```ts
GET /api/media/avatars/:filename
Response: Blob with Content-Type header (image/png | image/jpeg | image/webp)
```

## Behavior

Filename is validated with `FILENAME_PATTERN` (`route.ts:5–13`) before any storage access. Calls `downloadFile('avatars/<filename>')` from `@/lib/storage` (`route.ts:22`). Returns 400 for invalid filenames, 401 if unauthenticated, and 404 if the file does not exist in storage. Content-Type is resolved from the file extension; unknown extensions fall back to `application/octet-stream` (`route.ts:27–34`).

## Connections

- **depends_on:** `downloadFile` (`lib/storage`)
- **related:** [[entities/endpoints/get-api-media-logos-filename]]

## Sources

- `app/api/media/avatars/[filename]/route.ts` (lines 1–42)
