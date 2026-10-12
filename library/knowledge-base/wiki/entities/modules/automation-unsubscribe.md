---
type: entity
title: "automation/unsubscribe (module)"
entity_type: module
status: mature
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/automation/unsubscribe.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/modules/automation-sender]]"
  - "[[entities/endpoints/api-automation-unsubscribe-enrollmentid]]"
last_commit_hash: "91aec3d"
tags:
  - entity
  - automation
  - security
related:
  - "[[concepts/automation-flow-enrollment]]"
sources:
  - "lib/automation/unsubscribe.ts"
---

# automation/unsubscribe (module)

## Overview

HMAC-based token generation and verification for automation unsubscribe links (`lib/automation/unsubscribe.ts:1-47`). Provides cryptographically signed, timing-safe tokens appended to unsubscribe URLs in outgoing emails.

## Exported functions

### `buildAutomationUnsubscribeToken(enrollmentId)` → `string`

Creates a versioned HMAC-SHA256 token: `"v1.<base64url-signature>"` (`lib/automation/unsubscribe.ts:5-9`).

### `verifyAutomationUnsubscribeToken(enrollmentId, token)` → `boolean`

Parses version prefix; recomputes expected signature; compares via `crypto.timingSafeEqual` to prevent timing attacks (`lib/automation/unsubscribe.ts:11-33`). Returns `false` for null, malformed, or length-mismatched tokens.

## Secret resolution

`getUnsubscribeSecret()` reads `UNSUBSCRIBE_SECRET ?? AUTH_SECRET` (`lib/automation/unsubscribe.ts:39-46`). Throws if neither is set.

## Token format

```
v1.<base64url(HMAC-SHA256(enrollmentId, secret))>
```

## Connections

- **used_by:** [[entities/modules/automation-sender]] (build), [[entities/endpoints/api-automation-unsubscribe-enrollmentid]] (verify)

## Sources

- `lib/automation/unsubscribe.ts` (lines 1–47)
