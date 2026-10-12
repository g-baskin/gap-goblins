# Provenance

## Source

Gap Goblins was bootstrapped from the owner's own repository:

| Field | Value |
| --- | --- |
| Source repo | `g-baskin/online-crm-ai` (local clone at `/Users/dellcbyerllc/projects/online-crm-ai`) |
| Commit | `eabca74c1b2ea4c6495a17ac49c36c2c4f34603b` ("fix: close automation release review gaps", `origin/dev`) |
| Method | `git archive eabca74 \| tar -x` (tracked files only, no history, no `.env*` secrets) |
| Date | 2026-10-11 |
| History | Fresh. This repository does not share git history with online-crm-ai. |

online-crm-ai is the owner's code, so it may be copied freely. The two projects now evolve independently, and online-crm-ai is never modified from here.

## Reference repositories

Only the repositories marked "may copy" can be a source of code. Copied code keeps its upstream licence notice in the file header.

| Repository | Licence | Use |
| --- | --- | --- |
| g-baskin/online-crm-ai | Owner's code | Base of this repository |
| g-baskin/Legend-Copy-AI | MIT | May copy |
| omkarcloud/google-maps-scraper | MIT | Docs only (field names, export format, local API contract) |
| hitb1099/outreach-os | MIT | May copy |
| quionie/outreach-ai | MIT | May copy |
| AbdelftahZowail/Quickly | MIT | May copy |
| pypesdev/coldflow | GPL-3.0 | **Never copy or closely paraphrase** |
| LegendCopy, voice-agent-template | AGPL | **Do not touch** |

## Third-party services

- Google Maps data reaches Gap Goblins only through `LeadSource` adapters (`fixture`, `csv-import`, `omkar-desktop`). There is no direct Google Maps scraping.
- Resend is used for system/transactional email only. It never sends prospect outreach.
