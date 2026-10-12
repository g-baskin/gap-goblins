---
type: entity
title: "automation/types (module)"
entity_type: module
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/automation/types.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/modules/automation-flows]]"
  - "[[entities/modules/automation-enrollments]]"
  - "[[entities/modules/automation-sender]]"
  - "[[entities/QUEUE-pg-boss]]"
  - "[[entities/worker-pg-boss]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - automation
  - types
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "lib/automation/types.ts"
---

# automation/types (module)

## Overview

Shared TypeScript type and constant definitions for the automation feature (`lib/automation/types.ts:1-81`). Re-exported by consumer modules; also imported by the queue layer and worker for payload types.

## Constants and union types

| Export | Values |
|--------|--------|
| `AUTOMATION_FLOW_STATUSES` | `draft` \| `active` \| `paused` \| `archived` |
| `AUTOMATION_TRIGGER_TYPES` | `newsletter_subscriber_verified` \| `manual_enrollment` |
| `AUTOMATION_STEP_TYPES` | `send_email` \| `wait` |
| `AUTOMATION_DELAY_UNITS` | `minutes` \| `hours` \| `days` |
| `AUTOMATION_ENROLLMENT_STATUSES` | `active` \| `paused` \| `completed` \| `stopped` \| `converted` \| `bounced` \| `unsubscribed` \| `complained` |
| `AUTOMATION_ENGAGEMENT_STAGES` | `enrolled` \| `sent` \| `delivered` \| `opened` \| `clicked` \| `engaged` \| `hot` \| `converted` \| `stopped` |
| `AUTOMATION_EVENT_TYPES` | 15 event type strings (enrolled, step_queued, step_sent, completed, ...) |

## Key payload interfaces

```ts
export interface AutomationSendStepPayload {
  enrollmentId: string;
  flowId: string;
  stepId?: string;
  expectedStepOrder?: number;
}

export interface AutomationEnrollPayload {
  flowId: string;
  subscriberId?: string;
  contactId?: string;
}

export interface ConversionRule {
  pattern: string;
  action?: "mark_hot" | "convert";
  label?: string;
}
```

`AutomationSendStepPayload` is the pg-boss job payload for the `automation-send-step` queue (`lib/automation/types.ts:62-67`).

## Connections

- **used_by:** [[entities/modules/automation-flows]], [[entities/modules/automation-enrollments]], [[entities/modules/automation-sender]], [[entities/QUEUE-pg-boss]], [[entities/worker-pg-boss]]

## Sources

- `lib/automation/types.ts` (lines 1–81)
