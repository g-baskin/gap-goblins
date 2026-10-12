---
type: decision
title: "Switch package ecosystem to Bun"
status: accepted
adr_number: pending
decision_date: 2026-05-27
commit_sha: "aa1f2eb"
superseded_by: ""
supersedes: []
created: "2026-05-27"
updated: "2026-05-27"
tags:
  - decision
  - adr
  - tooling
sources:
  - "aa1f2eb"
---

# Switch package ecosystem to Bun

## Status

Accepted — 2026-05-27

## Context

Dependabot safe updates were landed with an explicit ecosystem switch in the commit subject.

## Decision

We adopted Bun as the runtime and package manager for dev, CI, Docker, and worker processes (`bun run dev`, `bun scripts/worker.ts` per CLAUDE.md).

## Consequences

- **Positive:** Unified Bun toolchain across web and worker services; faster installs.
- **Negative:** npm/yarn-specific workflows deprecated for this repo.
- **Affected entities:** [[entities/modules/worker-process]], Dockerfiles

## Sources

- **Commit:** `aa1f2eb`
- **Message:** `chore(deps): land safe dependabot updates, switch ecosystem to bun`
