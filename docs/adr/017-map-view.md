# ADR-017 — Map View

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.5. Memories have an optional `locations` table FK. A map view would let the Recipient explore memories geographically — a visual trail of places.

## Decision Drivers

- Location data is highly private (PRIV-03: EXIF/GPS absent from served media; GPS not stored at pixel level).
- No third-party requests from browser (RULE: ADR-011 / zero-analytics). This rules out Google Maps, Mapbox cloud tiles, etc.
- Self-hosted map tiles would require significant additional infrastructure.
- The `locations.labelSealed` column stores a human-readable location label (encrypted). Coordinates, if stored at all, must be stored only at a coarse precision (city/region level).

## Considered Options

1. **Self-hosted tile server** — Deploy a tile server (e.g., Protomaps) serving static tiles from S3. Fully private, no third-party requests.
2. **Text-only location** — Display the `labelSealed` location name in the Memory Panel without a map visual (current approach).
3. **Inline SVG world map** — Hand-crafted SVG with simplified geography; pin dropped by country/region code. No tile server needed.

## Decision

**Option 2 — Text-only location display (current default).**

This is a **stub** for a future map implementation. ADR-011 (zero third-party requests) hard-blocks Options using external tile APIs.

Switching to Option 1 requires:
1. Evaluate Protomaps (single-file `.pmtiles` format, served from S3).
2. Update `locations` schema: store `lat`/`lng` at ± 0.1° precision (city-level) — never exact coordinates.
3. New UI component: `MapView.tsx` using `maplibre-gl` (open source renderer; ~200 KB gzipped) or custom WebGL.
4. Signed tile URL serving via `/_m/*` route.
5. Privacy threat model update: even city-level coordinates can be identifying.
6. Human review required for privacy implications.

Switching to Option 3:
1. Static SVG asset with simplified world outline.
2. JS to project lat/lng to SVG coordinates.
3. Lightweight (~10 KB), no external dependencies.

## Consequences

- **Option 1:** Full cartographic experience; significant infrastructure and privacy analysis work.
- **Option 3:** Lightweight, privacy-safe; limited geographic accuracy.
- **Current (Option 2):** Simplest; location is text only, works for most memories.
