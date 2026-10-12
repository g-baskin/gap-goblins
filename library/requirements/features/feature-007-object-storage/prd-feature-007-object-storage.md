# Feature #007: Object Storage (Retroactive)

> **template-crm / admin-platform** — Feature PRD #007
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P1
> **Schema changes:** None (URLs stored on `admin_users.avatarUrl`, `site_settings` logo fields)

---

## Phase Overview

### Problem statement

Admin avatars and site logos must be stored durably and served securely — not as database blobs or public S3 URLs. Forks need MinIO locally and Tigris/Railway Bucket in production with minimal config churn.

### Goals (as shipped)

- S3-compatible client abstraction (`lib/storage`).
- Upload endpoints with size/type validation and SVG content inspection.
- Authenticated proxy routes for browser delivery.
- DELETE handlers that remove object + clear DB reference.
- Docker Compose MinIO for local dev; Railway Bucket env var mapping for prod.

### Scope

- `POST/DELETE /api/admin/upload/avatar`
- `POST/DELETE /api/admin/upload/logo`
- `GET /api/media/avatars/[filename]`
- `GET /api/media/logos/[filename]`
- `lib/storage/index.ts`, `lib/storage/client.ts`

---

## User Flows (as shipped)

1. Admin uploads avatar in Settings → file validated → stored at `avatars/{userId}/{filename}` → URL saved on user row.
2. Admin uploads logo → stored at `logos/{filename}` → site settings updated.
3. Browser requests image via `/api/media/...` → session checked → bytes streamed from bucket.
4. Admin deletes upload → object removed from bucket → DB field cleared.

---

## Data Model (shipped)

No dedicated media table. References:

- `admin_users.avatarUrl`
- `site_settings` logo fields (see schema)

---

## API Surface (shipped)

| Method | Path | Auth | Limits |
|---|---|---|---|
| POST, DELETE | `/api/admin/upload/avatar` | Session | 2 MB, PNG/JPG/WebP |
| POST, DELETE | `/api/admin/upload/logo` | Session | 2 MB, PNG/JPG/WebP/SVG |
| GET | `/api/media/avatars/[filename]` | Session | Proxy download |
| GET | `/api/media/logos/[filename]` | Session | Proxy download |

---

## File Map (existing)

| Path | Role |
|---|---|
| `lib/storage/client.ts` | Cached S3Client factory |
| `lib/storage/index.ts` | uploadFile, downloadFile, deleteFile |
| `app/api/admin/upload/avatar/route.ts` | Avatar upload/delete |
| `app/api/admin/upload/logo/route.ts` | Logo upload/delete |
| `app/api/media/avatars/[filename]/route.ts` | Avatar proxy |
| `app/api/media/logos/[filename]/route.ts` | Logo proxy |
| `docker-compose.yml` | MinIO service |

---

## Environment Variables (shipped)

| Variable | Purpose |
|---|---|
| `BUCKET_ENDPOINT` | S3 endpoint URL |
| `BUCKET_REGION` | Region (`us-east-1` local, `auto` Tigris) |
| `BUCKET_FORCE_PATH_STYLE` | `true` MinIO, `false` Tigris |
| `BUCKET_MEDIA_NAME` | Bucket name (default `media`) |
| `BUCKET_MEDIA_ACCESS_KEY_ID` | Access key |
| `BUCKET_MEDIA_SECRET_ACCESS_KEY` | Secret key |

---

## Locked Constraints

- Never store images as base64 in PostgreSQL
- Never serve unsigned public S3 URLs to browsers
- Never import `lib/storage` in Client Components (`server-only`)
- SVG validation must inspect buffer, not only MIME type

---

## Test Coverage (existing)

No dedicated upload route tests in glob — validation logic covered indirectly via integration. Recommended additions: upload route tests for MIME rejection.

Related infrastructure tests: deployment docs in HANDOFF; manual smoke via admin UI.

---

## Related docs

- [`knowledge-base/architecture/storage-and-media.md`](../../../knowledge-base/architecture/storage-and-media.md)
- [`knowledge-base/guides/local-development.md`](../../../knowledge-base/guides/local-development.md)
- [`HANDOFF.md`](../../../HANDOFF.md) §7e (Railway Bucket)

---

## Risks and Open Questions

- Session-gated media URLs mean email clients cannot load avatars from proxy URLs — email templates use `logo.png` from public/static or absolute hosted URLs as designed.
- Large file rejection returns 413 — client should surface error in upload UI.
