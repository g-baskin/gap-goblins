---
status: accepted
date: 2026-10-12
---

# Get businesses only through LeadSource adapters, with no direct Google Maps scraping

## Context and Problem Statement

The original brief had the app scrape Google Maps itself. Direct scraping brings legal, reliability and blocking risk to a multi-tenant SaaS, and its results are hard to verify.

## Considered Options

- Scrape Google Maps directly in the worker
- A pluggable `LeadSource` adapter interface that returns normalized business records

## Decision Outcome

Chosen option: `LeadSource` adapters. Milestone 1 ships `fixture`, `csv-import` (omkar exports and generic CSV) and `omkar-desktop` (the local omkar API, called with `fetch` and configured by `OMKAR_DESKTOP_API_URL`). If a source can't be verified, it is disabled with an explicit error rather than returning fake data.

## Consequences

- Good: no scraping code in the product; new sources plug in behind one interface.
- Bad: lead volume depends on the user's omkar app or CSV exports.
- Open: omkar's terms for use behind a multi-tenant SaaS still have to be checked (Phase 0 recon).
