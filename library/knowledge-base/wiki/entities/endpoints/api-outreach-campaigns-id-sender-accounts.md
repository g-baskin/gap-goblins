---
type: entity
entity_type: endpoint
title: "Outreach Campaign Sender Accounts"
path: "app/api/outreach/campaigns/[campaignId]/sender-accounts/route.ts"
route_path: /api/outreach/campaigns/[campaignId]/sender-accounts
http_methods:
  - GET
  - PUT
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/campaigns/[campaignId]/sender-accounts/route.ts
    lines: "1-90"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
related:
  - "[[entities/endpoints/api-outreach-sender-accounts]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Campaign Sender Accounts

`GET /api/outreach/campaigns/[campaignId]/sender-accounts` returns all sender accounts linked to the campaign. `PUT { senderAccountIds: string[] }` replaces the full set of sender accounts for the campaign — the association is stored as a many-to-many in `campaign_sender_accounts` (`app/api/outreach/campaigns/[campaignId]/sender-accounts/route.ts:40-87`). Requires admin session.
