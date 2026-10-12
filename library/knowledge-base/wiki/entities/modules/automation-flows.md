---
type: entity
title: "automation/flows (module)"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/automation/flows.ts"
language: ts
depends_on:
  - "[[entities/modules/automation-types]]"
used_by:
  - "[[entities/endpoints/api-automation-flows]]"
  - "[[entities/endpoints/api-automation-flows-flowid]]"
  - "[[entities/endpoints/api-automation-flows-flowid-activate]]"
  - "[[entities/endpoints/api-automation-flows-flowid-pause]]"
  - "[[entities/endpoints/api-automation-flows-flowid-steps]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - automation
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "lib/automation/flows.ts"
---

# automation/flows (module)

## Overview

Domain library for CRUD operations on automation flows. Uses worker DB client (`lib/db/worker`) (`lib/automation/flows.ts:8`). All functions are async and return typed Drizzle inference types.

## Exported functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `listAutomationFlows` | `() → AutomationFlowListItem[]` | All flows with per-flow step/enrollment/send counts (`lib/automation/flows.ts:44`) |
| `getAutomationFlow` | `(flowId) → AutomationFlow \| null` | Single flow by ID (`lib/automation/flows.ts:109`) |
| `createAutomationFlow` | `(input, userId) → AutomationFlow` | Insert new flow with defaults (`lib/automation/flows.ts:118`) |
| `updateAutomationFlow` | `(flowId, partial) → AutomationFlow \| null` | Partial update of config fields (`lib/automation/flows.ts:153`) |
| `archiveAutomationFlow` | `(flowId) → AutomationFlow \| null` | Sets status `"archived"` (`lib/automation/flows.ts:184`) |
| `pauseAutomationFlow` | `(flowId) → AutomationFlow \| null` | Sets status `"paused"` (`lib/automation/flows.ts:188`) |
| `activateAutomationFlow` | `(flowId) → AutomationFlow \| null` | Sets status `"active"`, guards ≥1 step (`lib/automation/flows.ts:192`) |

## Key types

```ts
export interface AutomationFlowInput { name, triggerType, status?, fromEmail?, ... }
export interface AutomationFlowListItem { id, name, status, stepCount, activeEnrollments, emailsSent, opened, clicked, ... }
export type AutomationFlow = typeof automationFlows.$inferSelect;
```

## Activation guard

`activateAutomationFlow` queries step count first; throws `Error("Automation flow must have at least one step before activation")` if count < 1 (`lib/automation/flows.ts:193-199`).

## Connections

- **depends_on:** [[entities/modules/automation-types]]
- **used_by:** [[entities/endpoints/api-automation-flows]], [[entities/endpoints/api-automation-flows-flowid]], [[entities/endpoints/api-automation-flows-flowid-activate]], [[entities/endpoints/api-automation-flows-flowid-pause]], [[entities/endpoints/api-automation-flows-flowid-steps]]

## Sources

- `lib/automation/flows.ts` (lines 1–216)
