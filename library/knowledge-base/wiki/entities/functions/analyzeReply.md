---
type: entity
title: "analyzeReply"
entity_type: function
status: mature
created: "2026-05-27"
updated: "2026-05-28"
path: "lib/outreach/ai/reply-analyzer.ts"
language: ts
depends_on:
  - "[[entities/env-vars/ANTHROPIC_API_KEY]]"
used_by:
  - "[[entities/functions/handleEmailReceived]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tested_by:
  - "lib/outreach/ai/__tests__/reply-analyzer.test.ts"
tags:
  - entity
  - ai
  - outreach
sources:
  - "lib/outreach/ai/reply-analyzer.ts"
---

# analyzeReply

## Overview

Classifies inbound outreach replies using Anthropic via AI SDK `generateObject`, returning sentiment, intent, summary, and a suggested reply in locked brand voice (`lib/outreach/ai/reply-analyzer.ts:7-19`).

## Signature / Definition

Returns `ReplyAnalysis` with `sentiment`, `summary`, `suggestedReply`, `intent` enum (`lib/outreach/ai/reply-analyzer.ts:7-19`, `37-50`).

Accepts optional `ConversationTurn[]` history capped at 20 turns (`reply-analyzer.ts:28-35`).

## Output shape

```ts
interface ReplyAnalysis {
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
  suggestedReply: string;
  intent: "schedule_call" | "wants_info" | "objection" | ...;
}
```

## Behavior

- Uses Zod schema `replyAnalysisSchema` for structured output (`reply-analyzer.ts:37-50`).
- Strips quoted history via `stripQuotedText` before analysis.
- SYSTEM_PROMPT enforces Australian English, banned phrases, no em-dashes, calendar link verbatim (see CLAUDE.md locked voice rules).

## Voice rules (SYSTEM_PROMPT)

- Australian English; no em-dashes; banned phrases include `"AI automation"`, `"AI-powered"` (`lib/outreach/ai/reply-analyzer.ts:56-77`).
- Calendar link verbatim: `__YOUR_CAL_LINK__` (`lib/outreach/ai/reply-analyzer.ts:71`).
- Signoff: `Thanks,\n{sender_first_name}` injected dynamically.
- Describe the offer as "we build systems", "tailored systems", or "custom systems" only.

## Connections

- **depends_on:** [[entities/env-vars/ANTHROPIC_API_KEY]]
- **used_by:** [[entities/functions/handleEmailReceived]]

## Sources

- `lib/outreach/ai/reply-analyzer.ts` (lines 1–50+)
