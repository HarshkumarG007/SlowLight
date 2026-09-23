# ADR-016 — HLS Adaptive Streaming

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.4. Currently, video is served as a single progressive MP4. For long-form videos (> 5 minutes) on mobile, adaptive bitrate streaming (HLS) would significantly improve the experience by adjusting quality to network conditions.

## Decision Drivers

- ffmpeg already in the worker pipeline — adding `hls` output is low incremental effort.
- CloudFront supports serving `.m3u8` playlists + `.ts` segments natively.
- Privacy concern: HLS manifests contain duration metadata. Must ensure manifests are also served via `/_m/*` signed URLs, not public paths.
- Safari on iOS requires HLS; current `<video>` progressive fallback works but sub-optimally for long content.

## Considered Options

1. **Full HLS** — ffmpeg outputs multi-bitrate HLS variants (1080p, 720p, 480p, 360p). Served via signed CloudFront URLs.
2. **DASH** — Alternative adaptive streaming. Less native iOS support; requires `dash.js` (extra JS weight).
3. **Progressive MP4 (current)** — Single file, `preload=metadata`. Simple; adequate for short clips.

## Decision

**Option 3 — Progressive MP4 (current default).**

This is a **stub** for if/when the Author adds video content > 5 minutes. Switching to Option 1 requires:

1. Worker pipeline: add `hls` ffmpeg output stage (output: `_hls/<assetId>/master.m3u8` + segment `.ts` files).
2. S3: segments stored alongside existing variants in media bucket.
3. API: `POST /media/access` returns signed URLs for the master playlist, not a raw MP4.
4. Frontend: use native `<video>` HLS support (Safari) + `hls.js` shim for Chrome/Firefox. hls.js adds ~75 KB gzipped — evaluate against performance budget.
5. Security review: ensure all segment and playlist URLs are signed; deny unsigned manifest access (SEC-07).

## Consequences

- **If adopted:** Better mobile video UX for long clips. +1 sprint for worker + UI changes.
- **If not adopted:** Works well for short/medium video clips under 5 minutes.
