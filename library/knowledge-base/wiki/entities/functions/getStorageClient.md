---
type: entity
title: "getStorageClient"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/storage/client.ts"
language: ts
depends_on:
  - "[[entities/env-vars/BUCKET_ENDPOINT]]"
used_by:
  - "[[entities/functions/uploadFile]]"
last_commit_hash: "7d7182249760c616df38f2fc4530a70f624e33c6"
tested_by: []
tags:
  - entity
  - storage
sources:
  - "lib/storage/client.ts"
---

# getStorageClient

## Overview

Returns a singleton `S3Client` configured for MinIO (local) or Railway Bucket/Tigris (production) (`lib/storage/client.ts:6-27`).

## Signature / Definition

```ts
export function getStorageClient(): S3Client
```

## Behavior

- Requires `BUCKET_ENDPOINT`, `BUCKET_MEDIA_ACCESS_KEY_ID`, `BUCKET_MEDIA_SECRET_ACCESS_KEY` (`lib/storage/client.ts:15-17`).
- `BUCKET_FORCE_PATH_STYLE === "true"` for MinIO path-style URLs (`lib/storage/client.ts:11`, `19-24`).

## Connections

- **used_by:** [[entities/functions/uploadFile]], `downloadFile`, `deleteFile`

## Sources

- `lib/storage/client.ts` (lines 1–27)
