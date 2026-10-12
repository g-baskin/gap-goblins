# Automation capability matrix

## Supported in graph workflows

| Area | Capability | Behavior |
|---|---|---|
| Triggers | Manual, contact, subscriber, deal stage, inbound webhook | One trigger per published graph |
| Logic | Conditions | Nested AND/OR groups and strict typed comparisons |
| Messaging | Email and SMS | SMS rechecks consent, DND, timezone, and quiet hours |
| Timing | Wait | Resumes through the graph queue |
| CRM | Tags and contact status | Tenant-scoped database actions |
| Pipelines | Create or move a deal | Contact, pipeline, stage, and deal ownership must match |
| Human work | Call task | Pauses until a person records an outcome |
| Integrations | Outbound webhook | HTTPS-only, signed, size-limited, redirect-free, SSRF checked |
| Extensibility | Registered custom action | Only reviewed, deployed server handlers and versions |
| Operations | Retry, skip, cancel | Admin-only, audited recovery from visible failure states |
| Authoring | Draft, publish, rollback, templates | Optimistic draft saves and immutable published revisions |

## Legacy coexistence

Unassigned workflows remain linear. Their active enrollments continue on `automation-send-step`. Assigning ownership or creating a draft never changes execution mode. A graph workflow changes mode only when a valid draft publishes. Every graph enrollment remains pinned to its original published revision.

## Deliberate phase-one limits

Cycles, loops, multi-input joins, A/B splits, goals, funnels, calendars, billing, marketplace distribution, arbitrary code, and automatic dialing are unsupported. The compiler rejects ambiguous graph structures instead of guessing.
