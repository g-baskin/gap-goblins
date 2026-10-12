---
type: entity
title: "GET/PATCH/DELETE /api/automation/flows/[flowId]"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/[flowId]/route.ts"
language: ts
http_methods:
  - GET
  - PATCH
  - DELETE
route_path: "/api/automation/flows/[flowId]"
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
  - "app/api/automation/flows/[flowId]/route.ts"
---

# GET/PATCH/DELETE /api/automation/flows/[flowId]

## Overview

Per-flow CRUD endpoint. GET returns the full flow detail with steps and stats; PATCH updates config fields; DELETE archives (soft-delete) (`app/api/automation/flows/[flowId]/route.ts:13-84`). All methods require admin auth.

## GET

- Returns `{ flow, steps, stats }` — calls `getAutomationFlow`, `listAutomationSteps`, and `getAutomationFlowStats` in parallel (`app/api/automation/flows/[flowId]/route.ts:27-31`).
- `404` if flow not found.

## PATCH

- Validates body against `updateAutomationFlowSchema` (Zod) (`app/api/automation/flows/[flowId]/route.ts:48-51`).
- Calls `updateAutomationFlow(flowId, parsed.data)` (`app/api/automation/flows/[flowId]/route.ts:56`).
- Returns updated `{ flow }` at `200`. `404` if not found.

## DELETE

- Calls `archiveAutomationFlow(flowId)` which sets status to `"archived"` (soft-delete) (`app/api/automation/flows/[flowId]/route.ts:76`).
- Returns `{ flow }` at `200`. `404` if not found.

## Connections

- **depends_on:** [[entities/modules/automation-flows]]

## Sources

- `app/api/automation/flows/[flowId]/route.ts` (lines 1–84)
