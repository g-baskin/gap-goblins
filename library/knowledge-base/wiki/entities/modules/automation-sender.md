---
type: entity
title: "automation/sender (module)"
entity_type: module
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/automation/sender.ts"
language: ts
depends_on:
  - "[[entities/modules/automation-enrollments]]"
  - "[[entities/modules/automation-unsubscribe]]"
used_by:
  - "[[entities/worker-pg-boss]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - automation
  - email
related:
  - "[[concepts/automation-flow-enrollment]]"
  - "[[entities/QUEUE-pg-boss]]"
sources:
  - "lib/automation/sender.ts"
---

# automation/sender (module)

## Overview

Worker-side module that sends a single automation email step for an enrollment (`lib/automation/sender.ts:32-202`). Uses the worker DB client (`lib/db/worker`) — not `server-only`. Called by `handleAutomationSendStep` in [[entities/worker-pg-boss]].

## Exported functions

### `sendAutomationStep(resend, payload)` → `SendAutomationStepResult`

Main entry point called by the worker (`lib/automation/sender.ts:32-202`).

1. Loads enrollment; skips if not `active` or if `currentStepOrder >= expectedStepOrder` (idempotency guard) (`lib/automation/sender.ts:38-53`).
2. Loads flow; skips if not `active` (`lib/automation/sender.ts:55-62`).
3. Loads step by `stepId ?? enrollment.currentStepId` (`lib/automation/sender.ts:65-73`).
4. For `wait` steps: marks completed, calls `advanceEnrollmentToNextStep`, returns skipped (`lib/automation/sender.ts:75-79`).
5. Checks for existing send; skips if already `sent/delivered/opened/clicked` (idempotency) (`lib/automation/sender.ts:81-89`).
6. Renders email via `renderAutomationEmail` (`lib/automation/sender.ts:91`).
7. Sends via `resend.emails.send()` with `List-Unsubscribe` / `List-Unsubscribe-Post` headers (RFC 8058) (`lib/automation/sender.ts:119-132`).
8. On success: updates `automationSends`, `automationEnrollments`, inserts `automationEvents`, calls `advanceEnrollmentToNextStep` (`lib/automation/sender.ts:140-174`).
9. On error: marks send `failed`, inserts failure event, returns `{ success: false }` (`lib/automation/sender.ts:181-201`).

### `renderAutomationEmail(step, enrollment, flow)` → `RenderAutomationEmailResult`

Builds subject, HTML, and plaintext for the step (`lib/automation/sender.ts:204-237`). Resolves subscriber/contact for token substitution. Sanitises HTML via `DOMPurify`.

### `buildAutomationUnsubscribeUrl(enrollment)` → `string`

Constructs the one-click unsubscribe URL: `{NEXT_PUBLIC_SITE_URL}/api/automation/unsubscribe/{id}?token=...` (`lib/automation/sender.ts:239-246`). Token built by [[entities/modules/automation-unsubscribe]].

## Connections

- **depends_on:** [[entities/modules/automation-enrollments]], [[entities/modules/automation-unsubscribe]]
- **used_by:** [[entities/worker-pg-boss]] (`scripts/worker.ts:254-264`)
- **related:** [[concepts/automation-flow-enrollment]], [[entities/QUEUE-pg-boss]]

## Sources

- `lib/automation/sender.ts` (lines 1–402)
