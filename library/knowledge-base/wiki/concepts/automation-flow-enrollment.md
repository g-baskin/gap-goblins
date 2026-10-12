---
type: concept
title: "Automation Flow Enrollment"
complexity: intermediate
domain: "automation"
status: developing
created: "2026-05-28"
updated: "2026-05-28"
tags:
  - concept
  - automation
  - enrollment
  - email
aliases:
  - "automation enrollment"
  - "flow enrollment"
related:
  - "[[entities/modules/automation-enrollments]]"
  - "[[entities/modules/automation-sender]]"
  - "[[entities/modules/automation-flows]]"
  - "[[entities/modules/automation-unsubscribe]]"
  - "[[entities/endpoints/api-automation-flows-flowid-enroll]]"
  - "[[entities/endpoints/api-automation-unsubscribe-enrollmentid]]"
  - "[[entities/QUEUE-pg-boss]]"
  - "[[entities/worker-pg-boss]]"
sources:
  - "lib/automation/enrollments.ts"
  - "lib/automation/sender.ts"
  - "lib/automation/unsubscribe.ts"
  - "app/api/automation/unsubscribe/[enrollmentId]/route.ts"
---

# Automation Flow Enrollment

## What it is

An **automation flow enrollment** is the record that tracks a specific subscriber or contact's progress through a multi-step email sequence (automation flow). Each enrollment has a current step, a next-step timestamp, and an engagement stage that captures the highest email engagement level achieved.

## Lifecycle diagram

```
Trigger
  │
  ▼
enrollSubscriberInFlow / enrollContactInFlow
  │  creates automationEnrollments row (status: "active")
  │  inserts "enrolled" automationEvents
  │
  ▼
scheduleEnrollmentNextStep
  │  looks up next step via getNextAutomationStep
  │  sets nextStepAt, enqueues automation-send-step job
  │
  ▼
pg-boss worker fires handleAutomationSendStep
  │
  ▼
sendAutomationStep (lib/automation/sender.ts)
  │  idempotency: skips if already sent or step already passed
  │  renders email (renderAutomationEmail)
  │  sends via Resend with List-Unsubscribe headers (RFC 8058)
  │  updates automationSends, automationEnrollments, automationEvents
  │
  ▼
advanceEnrollmentToNextStep
  │  → scheduleEnrollmentNextStep again (loop until no more steps)
  │
  ▼ (when no more steps)
status: "completed"

  OR

Unsubscribe click → stopEnrollment("unsubscribed")
  │  verifyAutomationUnsubscribeToken (HMAC-SHA256 timing-safe)
  │  sets newsletterSubscribers.unsubscribed = true
  ▼
status: "unsubscribed"
```

## Trigger types

| Trigger | Entry point |
|---------|-------------|
| `newsletter_subscriber_verified` | Auto-enrolled via `enrollSubscriberInActiveFlows` when a subscriber verifies their email |
| `manual_enrollment` | Admin-initiated via [[entities/endpoints/api-automation-flows-flowid-enroll]] |

## Queue layer

The `automation-send-step` queue in [[entities/QUEUE-pg-boss]] carries `AutomationSendStepPayload` (`enrollmentId`, `flowId`, `stepId`, `expectedStepOrder`). The `singletonKey: payload.enrollmentId` option prevents duplicate concurrent sends for the same enrollment.

## Unsubscribe path (RFC 8058)

[[entities/endpoints/api-automation-unsubscribe-enrollmentid]] handles both GET and POST. Token is `v1.<HMAC-SHA256(enrollmentId, UNSUBSCRIBE_SECRET)>` appended as `?token=...`. Mail clients supporting RFC 8058 one-click POST to this URL directly.

## Key idempotency rules

- `createEnrollment` uses `onConflictDoNothing()` — safe to call multiple times (`lib/automation/enrollments.ts:331`).
- `sendAutomationStep` checks `expectedStepOrder` and existing send status before sending (`lib/automation/sender.ts:48-89`).
- `enqueueAutomationSendStep` uses `singletonKey: enrollmentId` — only one queued job per enrollment at a time (`lib/queue/index.ts:112`).

## Sources

- `lib/automation/enrollments.ts` (full lifecycle)
- `lib/automation/sender.ts` (send + advance)
- `lib/automation/unsubscribe.ts` (token generation/verification)
- `lib/queue/index.ts:101-113` (queue config)
- `scripts/worker.ts:254-264` (handler)
