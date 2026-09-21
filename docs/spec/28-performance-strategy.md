# 28 — PERFORMANCE STRATEGY

## 28.1 Budgets (§28)
<!-- extract: packages/config/performance-budgets.json -->
```json
{
  "performanceBudgets": {
    "initialJS": "Veil route <= 120 KB gzip (React, router, WebAuthn browser, machine); world chunk <= 350 KB gzip loaded only after authentication",
    "initialCSS": "<= 20 KB gzip",
    "initialImages": "0 raster images on the Veil (CSS/SVG light only)",
    "fonts": "<= 120 KB total WOFF2, two variable files preloaded",
    "largestContentfulPaint": "<= 1.8 s on Fast 4G, mid-tier Android; <= 1.0 s desktop",
    "interactionLatency": "INP <= 200 ms; hover ring <= 100 ms",
    "cumulativeLayoutShift": "<= 0.05",
    "frameRate": "Ultra/High 60 fps; Medium >= 45; Low >= 30",
    "mobileMemoryTarget": "<= 250 MB total (JS heap + GPU estimate) on Low tier",
    "gpu": "<= 96 MB Ultra, <= 32 MB Low; <= 40 draw calls desktop, <= 20 mobile",
    "api": "world manifest <= 150 ms server time at 2,000 memories; p95 memory fetch <= 100 ms"
  }
}
```

## 28.2 Loading strategy (privacy-aware)
- **Critical path:** static HTML → Veil chunk → `GET /session`. The world chunk (Three.js, engine, post-processing) is `import()`ed **after** the passkey prompt appears (speculatively, same-origin, no data) so it is warm by the time authentication succeeds.
- Fonts: WOFF2 subsets, `font-display: swap`, size-adjusted fallbacks. Audio beds load after Threshold begins. Media: `thumb`/LQIP first, `display` on open, `zoom` only on demand; `loading="lazy"`, `decoding="async"`, `fetchpriority` on the visible cover only; video `preload="metadata"`.
- Preload only what is next *and* idle: the next memory's `thumb` (never full media).

## 28.3 Most expensive items and responses (§55)
| Area | Expensive thing | Strategy |
|---|---|---|
| JavaScript | Three.js + postprocessing (~200 KB gz) | Import only used classes (tree-shaking), lazy world chunk, no drei/R3F, no animation library |
| Shaders | Full-screen bloom on mobile | Tiered; Low uses no composer with fake bloom sprites; half-res bloom mipmap blur |
| Textures | (none) photos are DOM; only tiny glow textures | ≤ 1 MB total GPU textures; no texture atlases needed |
| Models | none | Instanced quads only; LOD by significance beyond distance |
| Video | Large MP4s | 720p default, `+faststart`, `preload=metadata`, no autoplay |
| Fonts | Two variable fonts | Subset; preload; 120 KB cap |
| Network | Many media URLs | Batch `media/access:batch`; sign only visible items |
| Database | World manifest, search | Single-query manifest with indexes (`memories_timeline_idx`); RLS predicate on indexed columns; search over in-memory decrypted index (5-min TTL); `EXPLAIN` checks in tests |
| Memory | Object URLs and decoded images | Bounded LRU (≤ 40 items), revoke on close/logout |

## 28.4 Runtime behavior for battery and heat
Pause on hidden; idle throttle to 15 fps for ambient-only frames after 20 s of no input; Low tier caps 30 fps; no timers when reduced motion; the silence of the design is also its power budget.

## 28.5 Measurement
No RUM (privacy). Lighthouse CI on preview, `size-limit` on PRs, Playwright frame-time and memory harness (CPU 4× throttle), `renderer.info` assertions, dev-only stats overlay. A regression > 10% blocks merge.

## 28.6 Security ↔ performance trade-offs (§29)
| Trade-off | Choice (privacy favored) | Cost |
|---|---|---|
| CDN caching vs privacy | Edge cache disabled for private media | Slower repeat loads; mitigated by in-memory LRU and short-lived decoded blobs |
| Aggressive caching vs revocation | `no-store` everywhere private | More requests; acceptable at two viewers |
| Streaming vs encrypted blobs | SSE-KMS + range MP4, not app-encrypted blobs | Weaker against API compromise (residual R4) |
| Client-side E2EE vs usability | Not in v1 | Server can read sealed text when serving it |
| 3D quality vs battery | Tiers + governor + idle throttle | Less lavish on weak devices |
| Preload vs privacy | Preload only next `thumb` when idle | Slight latency on next open |
| Analytics vs privacy | None | No usage insight; Author uses conversation instead |
