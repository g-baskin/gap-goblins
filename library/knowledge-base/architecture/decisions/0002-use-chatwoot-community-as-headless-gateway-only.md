# 0002. Use Chatwoot Community as a headless gateway only

Date: 2026-09-08

## Status

Accepted

## Context

Online CRM AI needs an initial messaging gateway for web chat, SMS, and email without surrendering canonical data ownership or adopting a third-party product UI. Chatwoot Community Edition provides an MIT-licensed gateway option, while Chatwoot Enterprise material is outside the approved source and license boundary.

This decision specializes the ownership and adapter boundary in [ADR-0001](0001-own-canonical-data-behind-provider-neutral-adapters.md) for messaging. It was approved by [Feature PRD #010](../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md). Voice remains separate under [ADR-0003](0003-implement-voice-behind-an-independent-provider-interface.md), and the first-party runtime shape is recorded by [ADR-0004](0004-begin-with-a-modular-monolith-and-worker.md).

## Decision

We decided to use only Chatwoot Community Edition material available under the MIT license, from a separately deployed and pinned Community version, as a headless messaging gateway behind Online CRM AI's provider-neutral messaging adapter.

We decided not to include, copy, derive from, or depend on Chatwoot Enterprise code, tests, assets, documentation internals, APIs, license-gated behavior, or deployment artifacts.

We decided that Online CRM AI has no Chatwoot system-of-record dependency and no Chatwoot UI dependency. Product contacts, identities, threads, events, CRM state, workflows, permissions, reporting, APIs, and the custom Conversations UI remain first-party concerns. Chatwoot objects are replaceable projections connected through provider bindings.

## Consequences

**Positive:**
- Chatwoot can be disconnected or replaced without deleting canonical messaging history or changing product identifiers.
- Online CRM AI controls its product experience instead of embedding a provider console.
- The approved Community MIT boundary is explicit and independently reviewable.
- Messaging integration remains isolated behind the same provider-neutral architecture as other vendors.

**Negative:**
- Chatwoot must be deployed, pinned, operated, monitored, and upgraded separately.
- Online CRM AI must build and maintain its own Conversations UI, canonical messaging model, adapter, normalization, and reconciliation.
- Community-edition capability limits cannot be filled with Enterprise-only material; unsupported needs require first-party work or another provider.

**Neutral:**
- Required Community license and attribution notices remain part of release hygiene.
- The exact Community tag, deployment topology, and supported inbox integrations remain implementation gates in the PRD and are not decided by this ADR.

## Alternatives Considered

### Alternative: Use Chatwoot as the product system of record

This would reduce first-party persistence and normalization work. It was rejected because it would conflict with canonical product ownership and make provider replacement, outage behavior, and product-specific CRM/workflow semantics dependent on Chatwoot.

### Alternative: Embed or expose the Chatwoot UI

This would provide a messaging interface sooner. It was rejected because Online CRM AI requires a custom contact-centered omnichannel workspace and must not depend on Chatwoot UI routes, identifiers, permissions, or presentation.

### Alternative: Use Chatwoot Enterprise features or source

Enterprise capabilities might reduce implementation work. They were rejected because the approved boundary is Community MIT only; Enterprise-only code and behavior are explicitly outside scope.

### Alternative: Copy Community source into first-party domain modules

Vendoring could simplify some calls. It was rejected as the default because separate deployment and adapter isolation create a cleaner ownership and provenance boundary; any later vendoring decision would require separate review and explicit attribution.
