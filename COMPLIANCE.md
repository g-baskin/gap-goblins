# Compliance Register

Snapshot: 2026-10-12 · Scope: two-way SMS in the Conversations inbox only · Reviewed by: GG Coder compliance-guard (inline gate) · **NOT LEGAL ADVICE**

## Assumed exposure profile

- Reach: workspaces (US small businesses) text their own contacts from their own Twilio numbers. **Assumed**.
- Recipients: US consumers and businesses, reachable worldwide in principle. **Assumed**.
- Data: phone numbers, message text, consent records with source and timezone. **Confirmed (CODE)**.
- Minors: possible recipients, no age gate. **Assumed**.

## Findings

| ID | Severity | Trigger | Evidence | Obligation | Status | Guard |
| --- | --- | --- | --- | --- | --- | --- |
| SMS-1 | HIGH | Texting a number without provable prior consent (TCPA) | CODE | Consent record with how it was given and when | Implemented: the inbox will not send without recorded consent (source, timezone, time, who recorded it) | `lib/messaging/__tests__/inbox.integration.test.ts` "blocks sending until consent is recorded" |
| SMS-2 | HIGH | Opt-out not honoured on every channel | CODE + RUNTIME (signed webhook) | Process STOP-type replies promptly and stop all texts | Implemented: carrier-standard opt-out keywords mark every identity for the number opted out; sends are then refused | Tests "STOP opts the contact out…", "%s also opts the contact out" |
| SMS-3 | HIGH | Texts at night | CODE | Quiet hours in the recipient's timezone | Implemented: no sends 8pm–8am in the contact's recorded timezone | Test "refuses to send during the contact's quiet hours" |
| SMS-4 | HIGH | Unregistered US long-code traffic | DEDUCED | A2P 10DLC brand and campaign registration with carriers | Open: each workspace must register in Twilio; the Settings page says so | None (outside the app) |
| SMS-5 | MEDIUM | Lead Finder prospects are scraped business numbers | DEDUCED | Scraped numbers carry no consent | Open: the inbox only texts numbers with recorded consent; nothing imports Lead Finder numbers as consented | Consent gate (SMS-1) |
| SMS-6 | MEDIUM | National Do Not Call registry and state mini-TCPA laws | DEDUCED | DNC scrubbing for marketing texts; stricter state rules (for example Florida, Oklahoma) | Open | None |
| SMS-7 | MEDIUM | Consent record retention | DEDUCED | Keep consent records for years | Open: consent lives on `contact_identities.metadata`; there is no deletion path yet, so it is kept | None |

## Open — needs a decision from you

- Who registers A2P 10DLC (each workspace, or you on their behalf) and what message types are allowed.
- Whether to scrub numbers against the National Do Not Call registry before marketing texts.

## Needs a lawyer

- Consent wording for web forms and how workspaces may use the inbox for marketing versus conversational replies.
- The FCC's revised TCPA revocation order (reported adopted 30 Sept 2026): check the published text before relying on the opt-out handling above.

## Re-verify before relying (date-sensitive)

- TCPA damages ($500–$1,500 per message) and the 10-business-day revocation window: snapshot 11 Aug 2026, not re-checked here.
- Twilio's default opt-out keyword list and A2P 10DLC rules.
