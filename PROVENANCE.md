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
| g-baskin/PawOs2 | Owner's proprietary code | May copy (owner approved 2026-10-12) |
| g-baskin/proximity-scheduling | Owner's proprietary code (© New Big Systems) | May copy (owner approved 2026-10-12) |
| pypesdev/coldflow | GPL-3.0 | **Never copy or closely paraphrase** |
| LegendCopy, voice-agent-template | AGPL | **Do not touch** |

## Territories (adapted from PawOs2, 2026-10-12)

Territory support was adapted, not copied wholesale, from PawOs2 commit `b78f88e` (its lessons service areas), which itself adapted proximity-scheduling's `geo.ts` and `boundary-validation.ts` (proximity-scheduling HEAD `473d397` at the time).

| Gap Goblins file | Adapted from (PawOs2 @ b78f88e) | What was taken |
| --- | --- | --- |
| `lib/lead-finder/territories/geometry.ts` | `packages/domain/src/lessons/territories.ts` | Point-in-polygon with boundary handling, ring and hole validation, ZIP list parsing |
| `lib/lead-finder/territories/census.ts` | `apps/operations-web/src/lib/server/geo-lookup.ts` | TIGERweb ZCTA and Census Geocoder endpoints and query parameters; response parsing rewritten |
| `components/lead-finder/TerritoryMap.tsx` | `apps/operations-web/src/lib/components/ServiceAreaMap.svelte` | Leaflet + Geoman drawing modes and edit checks, rewritten from Svelte to React |

Not taken: PawOs2's trainer scheduling, travel-time and lesson logic.

## Third-party services

- Google Maps data reaches Gap Goblins only through `LeadSource` adapters (`fixture`, `csv-import`, `omkar-desktop`). There is no direct Google Maps scraping.
- U.S. Census Bureau TIGERweb (ZIP outlines) and Census Geocoder (address lookups) are called server-side for territories. Both are free and keyless. Sample (fixture) data is never sent to them. See `docs/adr/0005-territories-census-and-map-tiles.md`.
- Territory map background tiles come from OpenStreetMap's public tile server by default (`MAP_TILE_URL` overrides it). Its usage policy allows light use only.
- Resend is used for system/transactional email only. It never sends prospect outreach.
- Twilio carries two-way SMS for the Conversations inbox, through each workspace's own Twilio account (owner approved 2026-10-12). See `docs/adr/0006-two-way-sms-via-tenant-twilio.md` and `COMPLIANCE.md`.
