---
type: question
title: "Was plain-mailbox Reply-To an ADR?"
question: "Did commit history encode the decision to use sender plain mailbox Reply-To instead of reply+uuid@ addresses?"
answer_quality: draft
created: "2026-05-27"
updated: "2026-05-27"
status: seed
tags:
  - question
  - outreach
related:
  - "[[concepts/outreach-reply-to-matching]]"
  - "[[entities/functions/sendEmail]]"
sources:
  - "lib/outreach/sending/sender.ts"
  - "CLAUDE.md"
---

# Was plain-mailbox Reply-To an ADR?

## Question

The Reply-To rule is documented as LOCKED in CLAUDE.md with regression tests, and implemented in code (`sender.ts:237-251`). Git log search for "reply" in commit messages returned no Tier-1 decision commits in this scan.

## Evidence found

- Code comment block `CRITICAL: Reply-To MUST be the sender's plain mailbox` (`lib/outreach/sending/sender.ts:237-245`)
- Matching via In-Reply-To/References instead (`lib/outreach/lib/utils.ts:21-25`)

## Proposed resolution

Confirm with repo history whether this predates the template fork. If no commit found, keep as documented convention + concept page, not a fabricated ADR.

## Connections

- [[concepts/outreach-reply-to-matching]]
