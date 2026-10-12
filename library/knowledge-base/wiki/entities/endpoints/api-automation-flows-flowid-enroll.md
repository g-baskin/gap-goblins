---
type: entity
title: "POST /api/automation/flows/[flowId]/enroll"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/automation/flows/[flowId]/enroll/route.ts"
language: ts
http_methods:
  - POST
route_path: "/api/automation/flows/[flowId]/enroll"
auth_required: true
depends_on:
  - "[[entities/modules/automation-enrollments]]"
used_by: []
last_commit_hash: "91aec3d"
tags:
  - entity
  - api
  - automation
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "app/api/automation/flows/[flowId]/enroll/route.ts"
---

# POST /api/automation/flows/[flowId]/enroll

## Overview

Manual enrollment endpoint: enrolls a subscriber or contact in a specific flow (`app/api/automation/flows/[flowId]/enroll/route.ts:7-39`). Used for `manual_enrollment` trigger type. Requires admin auth.

## Request body

Validated against `manualEnrollmentSchema` (Zod). Must include either `subscriberId` or `contactId`.

## Behavior

1. Validates body; returns `422` on schema failure (`app/api/automation/flows/[flowId]/enroll/route.ts:14-19`).
2. Routes to `enrollSubscriberInFlow(flowId, subscriberId)` if `subscriberId` present, else `enrollContactInFlow(flowId, contactId)` (`app/api/automation/flows/[flowId]/enroll/route.ts:24-29`).
3. Returns `{ enrollment }` at `201`. Returns `400` if enrollment could not be created (e.g. flow not active, subscriber already enrolled).

## Connections

- **depends_on:** [[entities/modules/automation-enrollments]]
- **related:** [[concepts/automation-flow-enrollment]]

## Sources

- `app/api/automation/flows/[flowId]/enroll/route.ts` (lines 1–39)
