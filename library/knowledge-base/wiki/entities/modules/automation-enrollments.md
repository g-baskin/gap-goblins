---
type: entity
title: "automation/enrollments (module)"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/automation/enrollments.ts"
language: ts
depends_on:
  - "[[entities/modules/automation-types]]"
  - "[[entities/QUEUE-pg-boss]]"
used_by:
  - "[[entities/endpoints/api-automation-flows-flowid-enroll]]"
  - "[[entities/endpoints/api-automation-unsubscribe-enrollmentid]]"
  - "[[entities/modules/automation-sender]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - automation
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "lib/automation/enrollments.ts"
---

# automation/enrollments (module)

## Overview

Domain library for creating, advancing, stopping, and converting automation enrollments. Uses worker DB client (`lib/automation/enrollments.ts:9`). Integrates with [[entities/QUEUE-pg-boss]] to schedule next-step send jobs.

## Exported functions

| Function | Purpose |
|----------|---------|
| `enrollSubscriberInActiveFlows(subscriberId)` | Enroll in all active `newsletter_subscriber_verified` flows (`lib/automation/enrollments.ts:16`) |
| `enrollSubscriberInFlow(flowId, subscriberId)` | Enroll a single subscriber; guards: flow active, subscriber verified + not unsubscribed, no existing enrollment (`lib/automation/enrollments.ts:40`) |
| `enrollContactInFlow(flowId, contactId)` | Enroll a contact; guards: flow not archived, contact exists, no existing enrollment (`lib/automation/enrollments.ts:85`) |
| `stopEnrollment(enrollmentId, reason, status?)` | Set enrollment `stopped`/`unsubscribed`; inserts stop event (`lib/automation/enrollments.ts:125`) |
| `markEnrollmentConverted(enrollmentId, reason)` | Set enrollment `converted`; inserts conversion event (`lib/automation/enrollments.ts:160`) |
| `advanceEnrollmentToNextStep(enrollmentId)` | Alias for `scheduleEnrollmentNextStep` (`lib/automation/enrollments.ts:194`) |
| `scheduleEnrollmentNextStep(enrollmentId)` | Looks up next step, sets `nextStepAt`, enqueues `automation-send-step` via `enqueueAutomationSendStep` (`lib/automation/enrollments.ts:200`) |

## Step scheduling flow

```
scheduleEnrollmentNextStep
  → getNextAutomationStep(flowId, currentStepOrder)  [from ./steps]
  → calculateStepRunAt(nextStep, now)               [from ./steps]
  → db.update(automationEnrollments)
  → enqueueAutomationSendStep({ enrollmentId, flowId, stepId, expectedStepOrder }, { startAfter })
```

If no next step exists, the enrollment transitions to `"completed"` (`lib/automation/enrollments.ts:217-240`).

## Idempotency

`createEnrollment` uses `onConflictDoNothing()` — safe to call concurrently. Returns existing enrollment if insert was a no-op (`lib/automation/enrollments.ts:341-351`).

## Connections

- **depends_on:** [[entities/modules/automation-types]], [[entities/QUEUE-pg-boss]]
- **used_by:** [[entities/endpoints/api-automation-flows-flowid-enroll]], [[entities/endpoints/api-automation-unsubscribe-enrollmentid]], [[entities/modules/automation-sender]]
- **related:** [[concepts/automation-flow-enrollment]]

## Sources

- `lib/automation/enrollments.ts` (lines 1–370)
