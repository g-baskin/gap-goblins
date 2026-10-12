---
type: entity
title: "createNewsletterOrchestrator"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/newsletter/orchestrator.ts"
language: ts
depends_on:
  - "[[entities/classes/NewsletterOrchestrator]]"
used_by:
  - "[[entities/endpoints/post-api-newsletter-generate]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - factory
related: []
sources:
  - "lib/newsletter/orchestrator.ts"
partial_scan: true
---

# createNewsletterOrchestrator

## Overview

Thin factory function that instantiates and returns a `NewsletterOrchestrator`. The class itself is not exported, so all call sites must go through this factory. This keeps the constructor private to the module and allows future DI without changing call sites (`lib/newsletter/orchestrator.ts:598–600`).

## Signature / Definition

```ts
export function createNewsletterOrchestrator(config: OrchestratorConfig): NewsletterOrchestrator
```

Where `OrchestratorConfig = { anthropicApiKey: string }`.

## Behavior

Creates and returns a new `NewsletterOrchestrator` instance with the given API key. No validation; callers are responsible for ensuring `anthropicApiKey` is non-empty (the generate route checks `process.env.ANTHROPIC_API_KEY` before calling — `app/api/newsletter/generate/route.ts:95`).

## Connections

- **depends_on:** [[entities/classes/NewsletterOrchestrator]]
- **used_by:** [[entities/endpoints/post-api-newsletter-generate]]

## History

- **Last touched:** commit `40438e4`

## Sources

- `lib/newsletter/orchestrator.ts` (lines 597–600)
