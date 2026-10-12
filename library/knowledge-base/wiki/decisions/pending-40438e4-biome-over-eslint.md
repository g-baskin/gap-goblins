---
type: decision
title: "Migrate ESLint to Biome"
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
  - tooling
related:
  - "[[decisions/pending-40438e4-middleware-to-proxy]]"
sources:
  - "40438e4241456e1be4eff2cdb1c3373e91685f65"
---

# Migrate ESLint to Biome

## Status

Accepted — 2026-05-27

## Context

The template-crm modernization commit consolidated lint/format tooling and pinned Bun for Docker/CI consistency. Commit body lists: "Migrate ESLint to Biome; pin Bun 1.3.14 in Docker/CI".

## Decision

We replaced ESLint with Biome for lint and format checks (`bun run lint`, `bun run format`). CI workflow updated in the same commit.

## Consequences

- **Positive:** Single Biome toolchain; faster local/CI checks; aligns with Bun-native workflow.
- **Negative:** ESLint plugin ecosystem no longer available; custom ESLint rules must be ported to Biome or dropped.
- **Affected entities:** `.github/workflows/ci.yml`, `package.json` scripts (CLAUDE.md documents `bun run lint`).

## Sources

- **Commit:** `40438e4241456e1be4eff2cdb1c3373e91685f65` by AutomationGod on 2026-05-27
- **Message:** `feat: modernize stack and fix local dev for template-crm`
- **Body:**
  > - Migrate ESLint to Biome; pin Bun 1.3.14 in Docker/CI
