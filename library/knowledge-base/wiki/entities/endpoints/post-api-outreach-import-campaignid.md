---
type: entity
entity_type: endpoint
title: "Outreach Import Contacts to Campaign"
path: "app/api/outreach/import/[campaignId]/route.ts"
route_path: /api/outreach/import/[campaignId]
http_methods:
  - POST
auth_required: false
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/import/[campaignId]/route.ts
    lines: "1-170"
depends_on:
  - "[[entities/lib-db]]"
  - "[[entities/lib-outreach-import]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-outreach-campaigns-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Import Contacts to Campaign

`POST /api/outreach/import/[campaignId]` accepts a JSON array of contact objects (`email`, `firstName`, `lastName`, `company`, `metadata`) authenticated by `x-api-key` header (checked against `OUTREACH_API_KEY` env var). Runs duplicate detection, blocklist filtering, and batch-inserts remaining contacts via `importOutreachContacts` (`app/api/outreach/import/[campaignId]/route.ts:34-164`). Returns `{ imported, skipped, errors }`. Does not require admin session — uses API key auth for automation/script access.
