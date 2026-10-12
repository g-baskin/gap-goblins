---
type: entity
title: "AUTH_SECRET"
entity_type: env-var
status: developing
created: "2026-05-28"
updated: "2026-05-28"
name: AUTH_SECRET
path: "lib/auth.config.ts"
language: ts
is_required: true
depends_on: []
used_by:
  - "[[entities/authConfig-module]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - env
  - auth
sources:
  - "lib/auth.config.ts"
---

# AUTH_SECRET

## Overview

NextAuth JWT signing secret. Falls back to legacy `NEXTAUTH_SECRET` (`lib/auth.config.ts:39`).

## Read sites

- `lib/auth.config.ts:39` — `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`

## Connections

- **used_by:** [[entities/authConfig-module]], [[entities/auth-module]]

## Sources

- `lib/auth.config.ts` (line 39)
