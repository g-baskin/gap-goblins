---
status: accepted
date: 2026-10-12
---

# Locate territories with U.S. Census data and an OpenStreetMap-tiled map

## Context and Problem Statement

Tenants want to mark out the areas they sell into and keep only the businesses inside them. That needs ZIP code outlines, a map point for each business, and a map to draw areas on. Each of those is an external service or a new dependency, which the owner must approve.

## Considered Options

- ZIP lists only, matching on the ZIP in each business's address (no external services, no map)
- U.S. Census Bureau services for ZIP outlines and address lookups, plus a Leaflet map with OpenStreetMap tiles
- A keyed commercial geocoder and tile provider

## Decision Outcome

Chosen option: Census services plus a Leaflet map, approved by the owner on 2026-10-12.

- ZIP outlines come from TIGERweb's 2020 ZCTA layer and are stored with the territory when a ZIP is added, so scans never depend on the Census being up.
- Businesses use their source's coordinates (omkar `coordinates`) first, then their stored location, then a Census Geocoder lookup of their address: at most 100 lookups per scan, one retry per business every 30 days, run in the worker only. Made-up sample (fixture) addresses are never looked up.
- A business with no usable location is kept and shown as "Not checked", never guessed. Businesses known to be outside the territory are skipped and counted.
- The map uses `leaflet@1.9.4` and `@geoman-io/leaflet-geoman-free@2.20.2` (pinned). Tiles default to OpenStreetMap's public server; `MAP_TILE_URL` and `MAP_TILE_ATTRIBUTION` switch providers, and the CSP allows only the configured tile host.

## Consequences

- Good: no API keys or cost; ZIP outlines are authoritative and stored per territory.
- Good: every outbound Census request is server-side with fixed hosts, time and size limits, and redirects refused.
- Bad: the Census services cover the U.S. only, and ZCTAs approximate (but do not exactly equal) USPS ZIP codes. PO-box-only ZIPs have no outline.
- Bad: OpenStreetMap's tile policy only allows light use. Before many tenants use the map, set `MAP_TILE_URL` to a production tile provider.
- Open: territory scans of address-only imports make up to 100 Census Geocoder requests each. If that proves slow, switch to the Census batch geocoder.
