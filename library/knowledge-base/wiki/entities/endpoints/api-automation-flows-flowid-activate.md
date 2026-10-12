---
type: entity
title: "POST /api/automation/flows/[flowId]/activate"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/[flowId]/activate/route.ts"
language: ts
http_methods:
  - POST
route_path: "/api/automation/flows/[flowId]/activate"
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
  - "app/api/automation/flows/[flowId]/activate/route.ts"
---

# POST /api/automation/flows/[flowId]/activate

## Overview

Transitions an automation flow from `draft` or `paused` to `active` (`app/api/automation/flows/[flowId]/activate/route.ts:6-27`). Requires admin auth. Validates that the flow has at least one step before activating — throws `400` with message if not.

## Behavior

- Calls `activateAutomationFlow(flowId)` from [[entities/modules/automation-flows]] (`app/api/automation/flows/[flowId]/activate/route.ts:15`).
- `activateAutomationFlow` enforces the step-count guard (throws `Error` if `stepCount < 1`).
- Returns `{ flow }` at `200`. `404` if not found. `400` for guard violations.

## Connections

- **depends_on:** [[entities/modules/automation-flows]]

## Sources

- `app/api/automation/flows/[flowId]/activate/route.ts` (lines 1–27)
