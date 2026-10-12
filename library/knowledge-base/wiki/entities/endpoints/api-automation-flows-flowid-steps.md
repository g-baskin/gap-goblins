---
type: entity
title: "GET/PUT /api/automation/flows/[flowId]/steps"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/[flowId]/steps/route.ts"
language: ts
http_methods:
  - GET
  - PUT
route_path: "/api/automation/flows/[flowId]/steps"
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
  - "app/api/automation/flows/[flowId]/steps/route.ts"
---

# GET/PUT /api/automation/flows/[flowId]/steps

## Overview

Step management endpoint for an automation flow. GET lists steps; PUT fully replaces the step sequence (replace-all semantics, not partial update) (`app/api/automation/flows/[flowId]/steps/route.ts:8-53`). Requires admin auth.

## GET

- Calls `listAutomationSteps(flowId)` (`app/api/automation/flows/[flowId]/steps/route.ts:17`).
- Returns `{ steps }` at `200`.

## PUT

- Validates body against `replaceAutomationStepsSchema` (Zod) (`app/api/automation/flows/[flowId]/steps/route.ts:34-37`).
- Verifies flow exists via `getAutomationFlow(flowId)` (`app/api/automation/flows/[flowId]/steps/route.ts:43-46`); returns `404` if not found.
- Calls `replaceAutomationSteps(flowId, parsed.data.steps)` — atomic replace (`app/api/automation/flows/[flowId]/steps/route.ts:48`).
- Returns `{ steps }` at `200`.

## Connections

- **depends_on:** [[entities/modules/automation-flows]]

## Sources

- `app/api/automation/flows/[flowId]/steps/route.ts` (lines 1–53)
