---
type: question
title: "Was grey-cloud hooks subdomain an ADR?"
question: "Is the hooks.* grey-cloud DNS decision recorded in git commit messages, or only in README/docs?"
answer_quality: solid
created: "2026-05-27"
updated: "2026-05-27"
status: seed
tags:
  - question
  - webhooks
  - cloudflare
related:
  - "[[concepts/cal-webhook-hooks-subdomain]]"
sources:
  - "app/api/webhooks/cal/README.md"
  - "proxy.ts"
---

# Was grey-cloud hooks subdomain an ADR?

## Question

Operational requirement for Cal.com webhooks is thoroughly documented in `app/api/webhooks/cal/README.md` and enforced in `proxy.ts`, but no Tier-1 git commit subject/body matching `adopt` / `decision:` was found in the scanned history.

## Evidence

- README explains Cloudflare 403 on apex vs grey-cloud hooks CNAME (`README.md:11-17`)
- `proxy.ts:49-65` webhook host lockdown

## Proposed resolution

Treat as operational runbook + concept ([[concepts/cal-webhook-hooks-subdomain]]), not an ADR unless an older commit is found during TS driver reconciliation.

## Connections

- [[concepts/cal-webhook-hooks-subdomain]]
