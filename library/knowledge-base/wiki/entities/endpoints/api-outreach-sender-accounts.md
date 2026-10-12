---
type: entity
entity_type: endpoint
title: "Outreach Sender Accounts List / Create"
path: "app/api/outreach/sender-accounts/route.ts"
route_path: /api/outreach/sender-accounts
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
  - path: app/api/outreach/sender-accounts/route.ts
    lines: "1-90"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-validations]]"
related:
  - "[[entities/endpoints/api-outreach-sender-accounts-id]]"
  - "[[entities/endpoints/api-outreach-campaigns-id-sender-accounts]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Sender Accounts List / Create

`GET /api/outreach/sender-accounts` returns all sender accounts with `campaignCount` derived by join. `POST` creates a new sender account with fields `email`, `name`, `signature`, `signatureHtml`, validated by `createSenderAccountSchema` (`app/api/outreach/sender-accounts/route.ts:40-84`). Requires admin session.
