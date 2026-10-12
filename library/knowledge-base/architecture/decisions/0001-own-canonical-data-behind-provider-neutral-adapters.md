# 0001. Own canonical data behind provider-neutral adapters

Date: 2026-09-08

## Status

Accepted

## Context

Online CRM AI needs a tenant-safe, contact-centered conversation model spanning web chat, SMS, email, and voice. External communications platforms have their own contacts, conversations, messages, identifiers, and statuses, but making those objects authoritative would create split ownership, couple product behavior to vendor models, and risk losing product history when a provider is disconnected or replaced.

This decision records the ownership rule approved by [Feature PRD #010](../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md). Its messaging and voice applications are detailed by [ADR-0002](0002-use-chatwoot-community-as-headless-gateway-only.md) and [ADR-0003](0003-implement-voice-behind-an-independent-provider-interface.md). The initial service shape is recorded by [ADR-0004](0004-begin-with-a-modular-monolith-and-worker.md).

## Decision

We decided that Online CRM AI owns the canonical tenant, contact, identity, conversation thread, conversation event, CRM, and workflow data. Canonical identifiers are generated and owned by Online CRM AI.

We decided that every communications vendor sits behind a provider-neutral adapter. Provider objects are external projections or evidence about canonical domain events, not authoritative product records. Provider bindings map canonical entities to external identifiers, and domain services and product UI consume normalized contracts rather than provider SDK objects, names, or identifiers.

## Consequences

**Positive:**
- Disconnecting or replacing a provider does not remove canonical contacts, conversation history, CRM state, or workflows.
- Product routes and UI remain stable when provider schemas, identifiers, or capabilities change.
- Tenant authorization, chronology, audit, consent, and suppression rules can be enforced consistently in one product-owned model.
- Adapters can be contract-tested and replaced independently.

**Negative:**
- Online CRM AI must maintain canonical schemas, provider bindings, normalization, reconciliation, and idempotent ingestion.
- Provider and canonical state can diverge temporarily, requiring retries, observability, and repair procedures.
- New provider features are unavailable to the product until represented in provider-neutral capabilities and domain contracts.

**Neutral:**
- Vendors may retain operational copies required to deliver communications, but those copies do not become product authority.
- Provider-specific identifiers and bounded diagnostic data remain available for tracing and reconciliation.

## Alternatives Considered

### Alternative: Make a communications vendor the system of record

This would reduce the amount of first-party domain modeling initially. It was rejected because it would couple product identity, history, CRM, and workflow behavior to one vendor and undermine replacement and outage resilience.

### Alternative: Maintain equal authority in Online CRM AI and each vendor

Dual authority could allow either side to initiate changes. It was rejected because conflict resolution would be ambiguous and data ownership would be difficult to reason about, audit, and test.

### Alternative: Integrate provider APIs directly from domain and UI code

Direct calls would shorten the first integration path. They were rejected because provider DTOs, identifiers, statuses, and failure semantics would leak across the product and make future replacement expensive.
