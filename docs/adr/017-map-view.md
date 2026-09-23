# ADR-017 — Map View

**Status:** Accepted  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.5. Memories have an optional `locations` table foreign key (`memories.location_id -> locations.id`). A map view allows the Recipient to explore memories geographically — tracing an intimate visual and emotional constellation of places shared together across time.

## Decision Drivers

- **Zero Third-Party Requests (ADR-011 / RULE-011)**: Commercial map services (Google Maps, Mapbox, OpenStreetMap tiles, CartoDB) require external network requests and tracking identifiers, violating our absolute zero-analytics and zero-third-party rule.
- **Privacy Model (PRIV-03 & Spec §12)**: Exact GPS/EXIF data must never reach the client. Location coordinates must be strictly coarse (city/region level at ±0.1° / ~11 km precision) and encrypted in the database (`locations.coords_sealed`).
- **Bundle Budget (PERF-01)**: The client World bundle budget is strictly 350 KB gzip. Heavy GIS libraries like MapLibre GL (~200 KB gz) or Leaflet (~45 KB gz) would severely exhaust this budget.
- **Poetic Aesthetic**: The map should not resemble a utilitarian driving navigation tool. It should evoke a romantic, celestial star chart or antique nautical map: deep midnight indigo water, delicate landmass silhouettes, golden graticule lines, and pulsing starlight pins.

## Considered Options

1. **Self-hosted tile server** — Deploy a tile server (e.g., Protomaps `.pmtiles` on S3) and render via MapLibre GL.
   - *Pros*: Full street-level zoom and pan.
   - *Cons*: ~200 KB JS bundle overhead, multi-gigabyte tile assets, excessive infrastructure complexity for personal memories.
2. **Text-only location** — Display only `locations.labelSealed` inside `MemoryPanel` without any cartographic visual.
   - *Pros*: Zero bundle cost.
   - *Cons*: Lacks geographical visualization and exploration.
3. **Inline Offline SVG World Map with Coarse Projection** — Hand-crafted vector landmass geometry embedded directly in the client bundle (~12 KB SVG) with pure TypeScript equirectangular projection of coarse coordinates.
   - *Pros*: 100% offline, zero external requests, 0 KB external library dependencies, complete privacy immunity, exquisite romantic aesthetic.
   - *Cons*: Simplified continental/regional outlines without micro-street level zoom.

## Decision

**Adopt Option 3: Inline Offline SVG World Map with Coarse Projection.**

### Key Implementation Specifications:
1. **Coordinate Coarsening & Privacy**:
   - The backend `GET /api/v1/map` endpoint unseals coordinates and rounds all latitude and longitude values to 1 decimal place (±0.1° precision, approximately 11 km). Exact GPS coordinates are never returned to the browser.
   - Locations with `precision === 'hidden'` are completely excluded from map queries.
2. **Offline Projection Engine (`packages/shared/src/map.ts`)**:
   - Implements lightweight, deterministic equirectangular projection `(lat, lng) -> (x, y)` mapped to the standard SVG coordinate box (viewBox: `0 0 1000 500`).
3. **Visual Experience (`apps/web/src/components/MapView.tsx`)**:
   - Styled with Slow Light night tokens: deep space ocean (`#070a12`), ethereal continent contours, and golden starlight memory pins.
   - Smooth mouse/touch drag panning, wheel zooming, and reset navigation.
   - Glowing pin markers with emotion color tinting.
   - Chronological constellation trails linking journey waypoints.
   - Interactive memory hover preview cards with instant deep-linking into `MemoryPanel`.

## Consequences

- Fully complies with ADR-011 (zero third-party requests) and PRIV-03 (coarse coordinates only).
- Client bundle impact is under 15 KB (uncompressed), easily preserving the 350 KB gzip World bundle budget.
- Delivers an enchanting, private cartographic exploration experience without external hosting overhead.
