---
type: entity
title: "GET/POST /api/automation/flows"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/route.ts"
language: ts
http_methods:
  - GET
  - POST
route_path: "/api/automation/flows"
auth_required: true
depends_on:
  - "[[entities/modules/automation-flows]]"
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - api
  - automation
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "app/api/automation/flows/route.ts"
---

# GET/POST /api/automation/flows

## Overview

Collection endpoint for automation flows. GET lists all flows with aggregate stats; POST creates a new flow (`app/api/automation/flows/route.ts:7-38`). Both methods require admin auth via `requireAutomationAdmin()`.

## GET

- Auth: `requireAutomationAdmin()` (`app/api/automation/flows/route.ts:8-9`).
- Calls `listAutomationFlows()` from [[entities/modules/automation-flows]] (`app/api/automation/flows/route.ts:12`).
- Returns `{ flows: AutomationFlowListItem[] }` with per-flow step count, active-enrollment count, and email engagement counts.
- Response: `200` on success, `500` on error.

## POST

- Auth: `requireAutomationAdmin()` (`app/api/automation/flows/route.ts:21-22`).
- Parses body; validates against `createAutomationFlowSchema` (Zod) (`app/api/automation/flows/route.ts:27-30`).
- Calls `createAutomationFlow(parsed.data, authResult.userId)` (`app/api/automation/flows/route.ts:33`).
- Returns `{ flow }` at `201` on success.

## Connections

- **depends_on:** [[entities/modules/automation-flows]]
- **related:** [[concepts/automation-flow-enrollment]]

## Sources

- `app/api/automation/flows/route.ts` (lines 1–39)
