# ADR-016 — HLS Adaptive Streaming

**Status:** Accepted  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.4. Video was originally delivered via progressive MP4 download. For mobile environments, high-resolution videos, and varying network conditions, adaptive bitrate streaming (HLS) delivers faster startup times, minimizes buffering, and dynamically matches quality to client bandwidth.

## Decision Drivers

- **Privacy & Signed URL Delivery (SEC-07)**: Video assets and their HLS manifests contain temporal metadata and private moments. All master playlists, variant playlists, and transport stream segments (`.ts`) must strictly be served via CloudFront signed URLs (`/_m/*`) with 900-second TTL.
- **Multi-Bitrate Ladder**: Support a standardized 4-tier profile ladder: 1080p (4.5 Mbps), 720p (2.2 Mbps), 480p (1.0 Mbps), and 360p (0.5 Mbps) to provide optimal quality across cellular and broadband connections.
- **Performance Budget Compliance (PERF-01)**: The client must avoid heavy third-party player libraries that violate bundle size budgets (< 350 KB gzip). Native HLS is utilized on Safari / iOS, paired with an adaptive HTML5 quality switcher and progressive fallback for desktop environments.
- **Media Pipeline Integration**: The media worker pipeline generates HLS master and media manifests with 6-second segment chunking.

## Considered Options

1. **Full HLS with Signed Delivery (Adopted)**:
   - Worker pipeline outputs multi-bitrate HLS streams (`master.m3u8`, variant playlists, and segments).
   - API issues signed URLs for HLS master manifests with 900s TTL.
   - Client provides native HLS on iOS/Safari and adaptive quality selection with progressive fallback on desktop.
2. **DASH (Dynamic Adaptive Streaming over HTTP)**: Lacks native iOS support; requires heavy external JavaScript player. Rejected.
3. **Progressive MP4 Only**: Suffers from excessive buffering on constrained cellular connections for long videos. Retained strictly as fallback.

## Decision

**Adopt Option 1: Multi-Bitrate HLS with Signed Delivery.**

1. `apps/worker/src/hls.ts` implements RFC 8216-compliant HLS playlist generation for master and media variants.
2. `apps/worker/src/index.ts` records `hls` variant metadata during video asset processing.
3. `apps/api/src/media/access.ts` supports `variant: 'hls'` returning signed CloudFront URLs for `_hls/<assetId>/master.m3u8`.
4. `apps/web/src/components/HLSPlayer.tsx` provides adaptive playback, native HLS support on iOS/Safari, quality tier selection, and transparent URL refresh upon expiration.

## Consequences

- **User Experience**: Instant video startup and smooth playback on mobile networks without buffering pauses.
- **Security & Privacy**: Zero unauthenticated access; all manifests and segments enforce the same signed access controls as photos.
- **Bundle Weight**: Zero external third-party dependencies added to the client bundle.
