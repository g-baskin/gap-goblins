---
type: entity
title: "uploadFile"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/storage/index.ts"
language: ts
depends_on:
  - "[[entities/functions/getStorageClient]]"
used_by:
  - "[[entities/endpoints/admin-upload-avatar]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by: []
tags:
  - entity
  - storage
sources:
  - "lib/storage/index.ts"
---

# uploadFile

## Overview

Server-only S3-compatible upload helper writing to the media bucket via AWS SDK `PutObjectCommand` (`lib/storage/index.ts:7-21`).

## Signature / Definition

```ts
export async function uploadFile(
  path: string,
  body: Buffer,
  opts: { contentType: string }
): Promise<void>
```

## Behavior

- Bucket from `MEDIA_BUCKET` env default `media` (`lib/storage/index.ts:5`).
- Uses cached client from `getStorageClient()` (`lib/storage/index.ts:12-20`).

## Connections

- **depends_on:** [[entities/functions/getStorageClient]]

## Sources

- `lib/storage/index.ts` (lines 5–21)
