# 0004. Begin with a modular monolith and worker

Date: 2026-09-08

## Status

Accepted

## Context

Online CRM AI already has a Next.js application, PostgreSQL-backed domain data, pg-boss queues, and a separately deployed worker. Feature PRD #010 adds canonical conversation data, webhook ingestion, normalization, outbound dispatch, and provider adapters. Those responsibilities need clear module boundaries and asynchronous processing, but Phase 0 does not provide evidence that independently deployed domain microservices are necessary.

This decision records the initial runtime shape for implementing [Feature PRD #010](../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md), [ADR-0001](0001-own-canonical-data-behind-provider-neutral-adapters.md), [ADR-0002](0002-use-chatwoot-community-as-headless-gateway-only.md), and [ADR-0003](0003-implement-voice-behind-an-independent-provider-interface.md).

## Decision

We decided to begin as a modular monolith plus a separately deployed worker rather than introducing microservices prematurely.

We decided that first-party domain capabilities remain modules within the existing application repository and process boundary, with explicit internal contracts between canonical domain services and provider adapters. HTTP and product UI responsibilities stay in the application; durable asynchronous normalization, dispatch, retry, and dead-letter work runs through the existing worker and queue pattern.

We decided that module boundaries must preserve a future extraction path, but extraction will require evidence such as independent scaling, reliability, ownership, or deployment needs rather than being assumed during Phase 0.

## Consequences

**Positive:**
- Phase 0 can reuse the existing application, PostgreSQL, pg-boss, deployment, authentication, and operational patterns.
- Transactions and canonical consistency are simpler when domain data shares one database and first-party application boundary.
- The team avoids distributed tracing, network contracts, service discovery, multi-service deployments, and cross-service failure modes before they are justified.
- Explicit module and adapter contracts retain a path to later extraction.

**Negative:**
- Application modules share a release cadence and can affect one another if boundaries are not enforced.
- The monolith may require later extraction if a capability develops materially different scaling, reliability, or ownership needs.
- The application and worker remain coordinated parts of one system and must keep shared contracts compatible.

**Neutral:**
- The worker is separately deployable for background processing, but it is not treated as an independently owned microservice.
- Chatwoot remains separately deployed under ADR-0002 because it is an external gateway, not a first-party domain service.

## Alternatives Considered

### Alternative: Start with domain microservices

Separate conversation, identity, messaging, voice, CRM, and workflow services could provide independent deployment boundaries. This was rejected because Phase 0 has no demonstrated need for that complexity and would introduce distributed transactions, versioned network contracts, operational overhead, and more failure modes.

### Alternative: Run all work in the web process

A single deployable process would be operationally smaller. It was rejected because webhook normalization, outbound dispatch, retry, and dead-letter work require durable asynchronous execution and the repository already has an established worker and queue pattern.

### Alternative: Build separate repositories for provider integrations

Repository separation could create strong organizational boundaries. It was rejected because it would add release and contract coordination without an approved need; provider isolation is achieved initially through modules and provider-neutral interfaces.
