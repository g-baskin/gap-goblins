---
status: accepted
date: 2026-10-12
---

# Use Resend for transactional email only, and send prospect outreach through tenant mailboxes

## Context and Problem Statement

The original brief sent the outreach sequences through Resend, which is already wired into the base. Resend's Acceptable Use Policy bans cold outreach and scraped contact data.

## Considered Options

- Send prospect outreach through Resend
- Send prospect outreach through the tenant's connected Gmail/Microsoft 365 mailboxes on separate outreach domains, and keep Resend for system email

## Decision Outcome

Chosen option: tenant mailboxes for outreach (Milestone 2), and Resend only for system and transactional email. Milestone 1 sends no email to prospects at all.

## Consequences

- Good: stays within Resend's policy and keeps the tenant's main domain reputation separate.
- Bad: Milestone 2 needs Gmail/M365 OAuth, mailbox rotation and per-mailbox throttling.
- The base's existing Resend outreach path must not be reused for prospects.
