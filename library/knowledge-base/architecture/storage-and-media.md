# Storage and Media

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

S3-compatible object storage for avatars and logos: MinIO locally, Railway Bucket (Tigris) in production, authenticated proxy serving.

**Related:**
- [`lib/storage/index.ts`](../../../lib/storage/index.ts)
- [`lib/storage/client.ts`](../../../lib/storage/client.ts)

---

## Overview

Files are **never** stored as base64 in PostgreSQL. Uploads go to bucket `media` (configurable via `BUCKET_MEDIA_NAME`). Browsers fetch files through **session-authenticated proxy routes**, not public S3 URLs.

---

## Environment variables

| Variable | Local (MinIO) | Production (Tigris) |
|---|---|---|
| `BUCKET_ENDPOINT` | `http://127.0.0.1:9000` | Railway Bucket endpoint |
| `BUCKET_REGION` | `us-east-1` | `auto` |
| `BUCKET_FORCE_PATH_STYLE` | `true` | `false` |
| `BUCKET_MEDIA_NAME` | `media` | from Railway Bucket |
| `BUCKET_MEDIA_ACCESS_KEY_ID` | minio admin | bucket access key |
| `BUCKET_MEDIA_SECRET_ACCESS_KEY` | minio secret | bucket secret |

Docker Compose provisions MinIO and auto-creates the `media` bucket.

---

## Server API

`lib/storage/index.ts` (`server-only`):

| Function | Purpose |
|---|---|
| `uploadFile(path, body, { contentType })` | Put object |
| `downloadFile(path)` | Get bytes or null |
| `deleteFile(path)` | Remove object |

Client factory: `lib/storage/client.ts` — cached `S3Client`.

---

## Upload endpoints

| Route | Limits | Types |
|---|---|---|
| `POST /api/admin/upload/avatar` | 2 MB | PNG, JPG, WebP |
| `POST /api/admin/upload/logo` | 2 MB | PNG, JPG, WebP, SVG (buffer-validated) |

Both support `DELETE` to remove storage object and clear DB URL field on user/site settings.

Requires NextAuth session.

---

## Proxy routes

| Route | Auth | Serves |
|---|---|---|
| `GET /api/media/avatars/[filename]` | Session required | User avatars |
| `GET /api/media/logos/[filename]` | Session required | Site logos |

---

## Security notes

- SVG uploads validated by inspecting buffer contents, not `file.type` alone.
- Do not import `lib/storage` in Client Components.
- Do not expose unsigned S3 URLs in API responses.

---

## Related docs

- [`requirements/features/feature-007-object-storage/`](../../requirements/features/feature-007-object-storage/)
- [`guides/local-development.md`](../guides/local-development.md)

---

## Changelog

- v1.0 (2026-05) — Initial storage documentation.
