# 0003. Implement voice behind an independent provider interface

Date: 2026-09-08

## Status

Accepted

## Context

Online CRM AI's unified contact timeline needs call activity, but voice ownership must not be routed through the messaging gateway. Phase 0 needs a practical US-first provider path and deterministic local and CI behavior without requiring provider credentials or making one provider permanent.

This decision applies [ADR-0001](0001-own-canonical-data-behind-provider-neutral-adapters.md) to voice and keeps voice independent from the Chatwoot boundary in [ADR-0002](0002-use-chatwoot-community-as-headless-gateway-only.md). It was approved by [Feature PRD #010](../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md). The initial application and worker topology is recorded by [ADR-0004](0004-begin-with-a-modular-monolith-and-worker.md).

## Decision

We decided to implement voice independently behind an Online CRM AI-owned, provider-neutral voice interface. Canonical calls and call events belong to Online CRM AI; adapters return external references and normalized outcomes rather than provider SDK objects.

We decided to use Twilio as the first provider adapter for the US Phase 0 path. We also decided to provide a deterministic simulator that implements the same contract and emits repeatable call-state transitions for local development, CI, and acceptance testing without credentials or real calls.

We decided that the provider interface is the replacement boundary for future voice providers. Domain services, product APIs, workers, and UI must not branch on Twilio-specific types or identifiers.

## Consequences

**Positive:**
- Voice can evolve or change providers without routing ownership through Chatwoot or rewriting the canonical call model.
- Deterministic tests do not depend on credentials, network access, provider sandboxes, or real phone calls.
- Twilio provides a concrete initial US integration while remaining an adapter rather than a permanent domain dependency.
- Calls can appear in the same canonical timeline as messaging events.

**Negative:**
- Online CRM AI must maintain the voice contract, simulator, Twilio adapter, callback normalization, and contract tests.
- The provider-neutral interface may expose only the common capabilities intentionally modeled by the product.
- Provider replacement still requires a new adapter and migration or reconciliation of external bindings.

**Neutral:**
- Recording remains off by default, as required by the PRD; this ADR does not approve recording or its consent, retention, access, or deletion design.
- The future replacement provider is deliberately not selected here.

## Alternatives Considered

### Alternative: Route voice through Chatwoot

This could consolidate communications behind one gateway. It was rejected because voice must remain independently owned and replaceable, and Chatwoot is approved only as a headless messaging gateway.

### Alternative: Integrate Twilio directly throughout the application

This would reduce abstraction work during Phase 0. It was rejected because Twilio types, statuses, and identifiers would leak into domain and UI code and make future replacement costly.

### Alternative: Require Twilio for every environment

Provider-backed tests could more closely resemble production. This was rejected because ordinary local and CI runs must remain deterministic, credential-free, safe, and free of real calls.

### Alternative: Select a different initial voice provider

Other providers may be suitable later. They were not selected for the approved US Phase 0 path; the provider interface preserves that future option without deciding it now.
