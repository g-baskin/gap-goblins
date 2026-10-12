---
type: decision
title: "Next.js middleware.ts to proxy.ts migration"
status: accepted
adr_number: pending
decision_date: 2026-05-27
commit_sha: "40438e4241456e1be4eff2cdb1c3373e91685f65"
superseded_by: ""
supersedes: []
created: "2026-05-27"
updated: "2026-05-27"
tags:
  - decision
  - adr
  - nextjs
related:
  - "[[entities/modules/proxy]]"
  - "[[concepts/nextauth-proxy-split]]"
sources:
  - "40438e4241456e1be4eff2cdb1c3373e91685f65"
---

# Next.js middleware.ts to proxy.ts migration

## Status

Accepted — 2026-05-27

## Context

Next.js 16 introduces the proxy convention replacing middleware for edge request interception. The CRM stack upgraded as part of template modernization.

## Decision

We migrated from `middleware.ts` to `proxy.ts` exporting `proxy` and `config.matcher`, preserving NextAuth session gating, CSP nonces, CSRF checks, and webhook host lockdown.

## Consequences

- **Positive:** Aligns with Next.js 16 App Router proxy API; same auth/CSP behavior in new entry file.
- **Negative:** Documentation and muscle memory must reference `proxy.ts` not `middleware.ts`.
- **Affected entities:** [[entities/modules/proxy]], [[concepts/nextauth-proxy-split]]

## Sources

- **Commit:** `40438e4241456e1be4eff2cdb1c3373e91685f65`
- **Body:** `Next.js 16 proxy migration (middleware.ts → proxy.ts)`
