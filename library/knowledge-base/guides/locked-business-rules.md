# Locked Business Rules

> Category: How-to Guide | Version: 1.0 | Date: May 2026 | Status: Active

Non-negotiable business and deliverability rules enforced by code and regression tests. Read before modifying outreach, CRM stages, or webhooks.

**Related:**
- [`CLAUDE.md`](../../../CLAUDE.md)
- [`HANDOFF.md`](../../../HANDOFF.md) §9

---

## Overview

These rules exist because breaking them causes **silent production failures** (Cloudflare 403, broken reply threading, wrong pipeline stages). Each has locked code markers and Vitest coverage.

---

## 1. Cal.com webhook URL (LOCKED)

**Production subscriber URL:**

```
https://hooks.__YOUR_DOMAIN__/api/webhooks/cal
```

**Rules:**

- Use dedicated `hooks.*` subdomain — **grey cloud (DNS only)** in Cloudflare.
- Do **not** point Cal.com at orange-cloud apex — Bot Fight Mode returns 403 before Railway.
- Do **not** orange-cloud the `hooks` CNAME.

**Why:** Cal.com POSTs are blocked at Cloudflare edge on proxied apex domains. Deals stay stuck at Contacted forever.

**Docs:** `app/api/webhooks/cal/README.md`  
**Tests:** `app/api/webhooks/cal/__tests__/route.test.ts`

---

## 2. Outreach Reply-To (LOCKED)

Outgoing outreach emails **must** use the sender's plain mailbox as `Reply-To`.

| ✅ Allowed | ❌ Forbidden |
|---|---|
| `Reply-To: sender@email.__YOUR_DOMAIN__` | `Reply-To: reply+<uuid>@email.__YOUR_DOMAIN__` |
| | Display-name tricks hiding UUID addresses |

**Why:**

- Recipients see Reply-To in Gmail/Outlook — UUID addresses look like spam.
- Replies must land in the real sender inbox.

**Matching inbound replies:**

- Primary: extract UUID from `In-Reply-To` / `References` → match `outreach_contacts.email_{1,2,3}_resend_id`
- Fallback: from-address match

**Locked files** (search `CRITICAL: Reply-To`):

- `lib/outreach/sending/sender.ts`
- `app/api/outreach/replies/[replyId]/send/route.ts`

**Tests:** `app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts` — *"sets Reply-To to the sender's plain mailbox"*

`generateReplyToAddress()` is **deprecated** — legacy matching only, never new sends.

---

## 3. CRM pipeline promotion (LOCKED)

**Stage order:** Lead → Contacted → Meeting Booked → Proposal Sent → Won / Lost

**Rules:**

- Outreach positive replies → deal at **Contacted** only (via `pushToCrm`).
- **Only** Cal.com `BOOKING_CREATED` webhook → **Meeting Booked**.
- AI reply intent must **not** bypass this — regardless of classification.

**Contact status hierarchy:** `subscriber` < `lead` < `qualified` < `customer` — never downgrade (RPC enforced).

**Code:**

- `lib/outreach/crm/push-to-crm.ts`
- `app/api/webhooks/cal/route.ts`

**Tests:** `lib/outreach/crm/__tests__/push-to-crm.test.ts`

---

## 4. Outreach AI voice (LOCKED)

Module: `lib/outreach/ai/reply-analyzer.ts`

Hard prompt rules (do not soften during refactors):

| Rule | Detail |
|---|---|
| Positioning | "we build systems" / "tailored systems" — **never** "AI automation" or "AI-powered" |
| Locale | Australian English |
| Tone | Direct, plainspoken; no corporate filler |
| Punctuation | **No em-dashes (—)** |
| Banned phrases | "circle back", "touch base", "reach out", "I hope this finds you well", "synergy", "leverage", "transform", "just wanted to", etc. |
| Signoff | `Thanks,\n{sender_first_name}` — dynamic, never hardcoded name |
| Calendar | Verbatim `__YOUR_CAL_LINK__` (replace token per fork) |
| Pricing | `$5,000 AUD+`, `4 to 8 weeks` reference |

**Tests:** `lib/outreach/ai/__tests__/reply-analyzer.test.ts`  
**Eval:** `bun scripts/eval-replies.ts` (8 cases, live Anthropic)

After prompt edits: restart dev server (Bun HMR may serve stale webhook module).

---

## 5. Newsletter subscribe anti-enumeration (LOCKED)

`POST /api/newsletter/subscribe` **always** returns `{ success: true }` for valid requests.

| Rule | Detail |
|---|---|
| Already verified | No re-send, no distinct response shape |
| Invalid email | `400` with validation message (only path that exposes error detail) |
| Rate limit | 5/min/IP → `429` |

**Why:** Prevents attackers from probing which emails are subscribed.

**Code:** `app/api/newsletter/subscribe/route.ts`  
**Tests:** `app/api/newsletter/subscribe/__tests__/route.test.ts`

Unsubscribe links use HMAC tokens (`UNSUBSCRIBE_SECRET`) — see `lib/newsletter/unsubscribe-token.ts`.

---

## 6. Webhook hostname lockdown (proxy)

On `hooks.*` / `webhooks.*` hostnames, non-webhook paths return **404** at `proxy.ts`. Marketing and admin must use apex domain.

---

## 7. Date formatting utility (SHARED)

All admin date rendering MUST go through `lib/utils/format-date.ts` — never inline `new Date(value).toLocaleDateString()` on untrusted data.

The helper returns `—` for null, undefined, invalid strings, or any date before year 2000. The pre-2000 guard exists specifically to catch Unix-epoch coercion (`new Date(null)` → 1969) — the root cause of the "31 Dec 1969" bug on the campaigns list (fixed by migration 0009).

```ts
import { formatDate } from "@/lib/utils/format-date";
// safe — returns "—" for null or epoch
formatDate(campaign.created_at);
// with custom options
formatDate(entry.created_at, "en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
```

**Tests:** `lib/utils/__tests__/format-date.test.ts` (6 cases)

---

## Change process

1. Read this doc + linked README/tests.
2. If rule must change, update **prompt/code/tests together** in one commit.
3. Run targeted tests + eval harness.
4. Update this doc and [`CLAUDE.md`](../../../CLAUDE.md).

---

## Changelog

- v1.0 (2026-05) — Consolidated from CLAUDE.md and HANDOFF.md.
