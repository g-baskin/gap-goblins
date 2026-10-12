---
type: entity
title: "POST /api/automation/flows/[flowId]/pause"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/[flowId]/pause/route.ts"
language: ts
http_methods:
  - POST
route_path: "/api/automation/flows/[flowId]/pause"
auth_required: true
depends_on:
  - "[[entities/modules/automation-flows]]"
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - api
  - automation
related: []
sources:
  - "app/api/automation/flows/[flowId]/pause/route.ts"
---

# POST /api/automation/flows/[flowId]/pause

## Overview

Transitions an active automation flow to `paused` status (`app/api/automation/flows/[flowId]/pause/route.ts:6-24`). Requires admin auth. Does not stop in-flight pg-boss jobs — pending sends already queued will still be processed.

## Behavior

- Calls `pauseAutomationFlow(flowId)` which sets `status = "paused"` (`app/api/automation/flows/[flowId]/pause/route.ts:12`).
- Returns `{ flow }` at `200`. `404` if flow not found.

## Connections

- **depends_on:** [[entities/modules/automation-flows]]

## Sources

- `app/api/automation/flows/[flowId]/pause/route.ts` (lines 1–24)
