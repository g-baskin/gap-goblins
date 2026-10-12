---
type: entity
title: "getThreadingHeaders"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/outreach/sending/threading.ts"
language: ts
depends_on: []
used_by:
  - "[[entities/sendEmail-outreach]]"
last_commit_hash: "40438e4241456e1be4eff2cdb1c3373e91685f65"
tags:
  - entity
  - outreach
related:
  - "[[concepts/outreach-reply-to-threading]]"
sources:
  - "lib/outreach/sending/threading.ts"
---

# getThreadingHeaders

## Overview

Builds `In-Reply-To` and `References` headers for follow-up sequence emails using the prior message's Resend ID wrapped as a Message-ID (`lib/outreach/sending/threading.ts`).

## Behavior

For email 2+, when a stored `email_{N-1}_resend_id` exists, returns:

```ts
{ "In-Reply-To": "<{resendId}>", "References": "<{resendId}>" }
```

Enables inbound reply routing via UUID match in [[entities/functions/handleEmailReceived]].

## Connections

- **used_by:** [[entities/sendEmail-outreach]]
- **concept:** [[concepts/outreach-reply-to-threading]]

## Sources

- `lib/outreach/sending/threading.ts`
