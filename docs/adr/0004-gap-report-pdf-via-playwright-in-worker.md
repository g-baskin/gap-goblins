---
status: accepted
date: 2026-10-12
---

# Render gap report PDFs with Playwright in the worker

## Context and Problem Statement

The gap report is the product's main sales asset and needs a sharp PDF version. The rendered content includes scraped text, so rendering has to be safe.

## Considered Options

- Add a new PDF library
- Use Playwright `page.pdf()`, which is already in the repo, from the pg-boss worker

## Decision Outcome

Chosen option: Playwright in the worker, with JavaScript disabled, all network requests blocked, the logo embedded as a data URI and all scraped text escaped. PDFs are stored under tenant-prefixed keys and served only through tenant-checked routes. `playwright` moves from devDependencies to dependencies.

## Consequences

- Good: no new dependency; the same HTML serves as the in-app preview and the PDF.
- Bad: production worker images need Chromium. Dockerfile changes are out of scope for Milestone 1 and are noted for deployment instead.
