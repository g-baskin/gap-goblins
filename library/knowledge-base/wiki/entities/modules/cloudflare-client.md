---
type: entity
title: "Cloudflare API client module"
entity_type: module
status: developing
created: "2026-05-27"
updated: "2026-05-27"
path: "lib/cloudflare/client.ts"
language: ts
depends_on:
  - "[[entities/env-vars/CLOUDFLARE_API_TOKEN]]"
used_by:
  - "[[entities/pages/cloudflare-settings-page]]"
last_commit_hash: "9762035"
tested_by: []
tags:
  - entity
  - cloudflare
  - admin
sources:
  - "lib/cloudflare/client.ts"
---

# Cloudflare API client module

## Overview

Server-only Cloudflare v4 API client for admin settings: DNS records, email routing, zone settings, single redirects, custom hostnames (`lib/cloudflare/client.ts:1-35`).

## Behavior

- Base URL `https://api.cloudflare.com/client/v4` (`client.ts:37`).
- Typed wrappers for zone operations imported from `./types` (`client.ts:4-35`).
- Added in commit `9762035` feat: add Cloudflare settings.

## Connections

- **related concept:** [[concepts/cal-webhook-hooks-subdomain]] (DNS grey-cloud for hooks subdomain documented separately)

## Sources

- `lib/cloudflare/client.ts` (lines 1–50+)
