---
type: entity
title: "validateFetchUrl"
entity_type: function
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "lib/branding/validate-fetch-url.ts"
language: ts
depends_on: []
used_by: []
last_commit_hash: "cbfa6b38eff4263650826a973c6af4e102b0a3b4"
tested_by:
  - "lib/branding/__tests__/validate-fetch-url.test.ts"
tags:
  - entity
  - security
  - branding
related: []
sources:
  - "lib/branding/validate-fetch-url.ts"
---

# validateFetchUrl

## Overview

Async guard for server-side fetches of user-supplied URLs. Blocks SSRF by rejecting private/reserved IPs, localhost, and cloud metadata hostnames after DNS resolution (`lib/branding/validate-fetch-url.ts:46-98`).

## Signature

```ts
export async function validateFetchUrl(raw: string): Promise<URL>
export class FetchUrlValidationError extends Error
```

## Behavior

1. Parse URL; allow only `http:` / `https:` (`lib/branding/validate-fetch-url.ts:59-61`).
2. Reject localhost and blocked hostnames including `169.254.169.254` (`lib/branding/validate-fetch-url.ts:65-74`).
3. `dns.resolve(hostname)` — reject if any A/AAAA record maps to private IPv4/IPv6 ranges (`lib/branding/validate-fetch-url.ts:76-96`).
4. DNS failure → block (`lib/branding/validate-fetch-url.ts:94-95`).

## Connections

- **tested_by:** `lib/branding/__tests__/validate-fetch-url.test.ts`

## Sources

- `lib/branding/validate-fetch-url.ts` (lines 39–99)
