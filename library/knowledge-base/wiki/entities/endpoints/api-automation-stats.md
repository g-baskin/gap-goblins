---
type: entity
title: "GET /api/automation/stats"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/stats/route.ts"
language: ts
http_methods:
  - GET
route_path: "/api/automation/stats"
auth_required: true
depends_on: []
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - api
  - automation
related: []
sources:
  - "app/api/automation/stats/route.ts"
---

# GET /api/automation/stats

## Overview

Returns aggregate dashboard stats for the automation feature (`app/api/automation/stats/route.ts:1-16`). Requires admin auth.

## Behavior

- Calls `getAutomationDashboardStats()` from `lib/automation/stats` (`app/api/automation/stats/route.ts:10`).
- Returns `{ stats }` at `200`. `500` on error.

## Gaps

`lib/automation/stats.ts` was not in this scan chunk — callee signature unknown. Flagged in gaps array.

## Connections

- **related:** [[entities/endpoints/api-automation-flows]]

## Sources

- `app/api/automation/stats/route.ts` (lines 1–16)
