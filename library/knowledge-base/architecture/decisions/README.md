# Architecture Decision Records

> Category: Architecture | Version: 1.0 | Date: September 2026 | Status: Active

Accepted architectural decisions for Online CRM AI, maintained as a minimal Nygard-style ADR log.

**Related:**
- [`../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md`](../../../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md)
- [`../system-overview.md`](../system-overview.md)
- [`../queue-and-worker.md`](../queue-and-worker.md)

---

## ADR Index

| ADR | Decision | Date | Status |
|---|---|---|---|
| [ADR-0001](0001-own-canonical-data-behind-provider-neutral-adapters.md) | Own canonical data behind provider-neutral adapters | 2026-09-08 | Accepted |
| [ADR-0002](0002-use-chatwoot-community-as-headless-gateway-only.md) | Use Chatwoot Community as a headless gateway only | 2026-09-08 | Accepted |
| [ADR-0003](0003-implement-voice-behind-an-independent-provider-interface.md) | Implement voice behind an independent provider interface | 2026-09-08 | Accepted |
| [ADR-0004](0004-begin-with-a-modular-monolith-and-worker.md) | Begin with a modular monolith and worker | 2026-09-08 | Accepted |

## Reading Order

Read ADR-0001 first because it defines product ownership and the provider boundary. ADR-0002 and ADR-0003 apply that boundary to messaging and voice. ADR-0004 records the initial deployment and service shape used to implement those boundaries.

## Conventions

- ADRs use the Nygard sections: Context, Decision, Consequences, and Alternatives Considered.
- Numbers are permanent, sequential, four-digit identifiers.
- Accepted decisions are changed only by a later ADR that links both directions when superseding an earlier record.
