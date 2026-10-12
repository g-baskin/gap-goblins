---
status: accepted
date: 2026-10-12
---

# Build Gap Goblins from an online-crm-ai export with fresh history

## Context and Problem Statement

Gap Goblins needs CRM, tenancy, a queue, storage and auth. online-crm-ai already has all of them, but its working tree has uncommitted work, and the original brief wanted the product built inside that repository.

## Considered Options

- Build inside online-crm-ai (the original brief)
- Fork online-crm-ai and keep its git history
- Export online-crm-ai at commit eabca74 with `git archive` into a new private repo with fresh history

## Decision Outcome

Chosen option: export at eabca74 into the private repo g-baskin/gap-goblins with fresh history. This reuses the code while keeping online-crm-ai completely untouched, and gives Gap Goblins an independent history. Provenance goes in PROVENANCE.md.

## Consequences

- Good: online-crm-ai is never modified; the products can diverge freely.
- Bad: fixes don't flow automatically between the repos and have to be ported by hand.
- Bad: the base's non-tenant-scoped tables (outreach_*, site_settings, admin_settings, integration_credentials) come along and must not be used for tenant data.
