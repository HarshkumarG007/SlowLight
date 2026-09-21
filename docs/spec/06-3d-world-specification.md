# 06 — 3D WORLD SPECIFICATION

## 6.1 Architecture
A framework-agnostic **Engine** (`apps/web/src/three/`) owns the renderer, loop, scene, GPU resources and quality tier. React mounts a `<canvas>` and talks to the Engine only through a typed **command/event bus** — no React state is read inside the frame loop, no Three.js objects leak into React.

```
Engine
├── Renderer (WebGLRenderer, DPR cap, context-loss handling)
├── Loop (rAF, adaptive quality, visibility pause, idle throttle)
├── Stages: SkyStage (World, Unlit)  |  LampStage (Letters)
├── Systems: LightField · FieldStars · Constellations · RailCamera · Picking
│            Exposure (dark adaptation) · Atmosphere (fog, dust) · Post · AudioBridge
├── ResourceTracker (owns every geometry/material/texture/target; dispose())
└── Commands in: init, setWorld, focusMemory, focusChapter, travelTo(u), setTier,
                 setReducedMotion, enterLamp, exitLamp, rest, dispose
    Events out: ready, tierChanged, hover(id|null), select(id), chapterEnter(id), chapterLeave,
                railPosition(u), contextLost, contextRestored, frameStats(dev)
```

## 6.2 Scene graph
```
Scene (fog: exp2, color = scene.fog, density by tier)
├── FieldStars           Points + ShaderMaterial (3 depth shells for parallax)
├── LightField           InstancedMesh(quad) + instanced attributes
├── ConstellationLines   LineSegments (custom shader, uProgress per chapter)
├── UnlitRings           InstancedMesh(ring quad), steel-blue, hollow
├── Atmosphere           low-density dust Points (Medium+), tinted by ramp(t at camera)
└── Camera rig (PerspectiveCamera on Rail; child of a Group for parallax offsets)
LampStage (separate Scene, same renderer): glow quad, dust Points, camera fixed
```
No photographs or videos are ever textures in the scene (D-03). There are no lit PBR materials, no shadows, no reflections (deliberate: cost and meaning).

## 6.3 Layout: Rail, lights, chapters
Time becomes depth (R1). Determinism matters: the same data must always give the same sky ("the world remembers"). Reference implementation (validated in strict TypeScript; property tests in Doc 26):

<!-- extract: packages/shared/src/layout.ts -->
```ts
export interface LightInput {
  id: string;
  chapterIndex: number; // -1 when the memory has no chapter
  occurredAt: number; // epoch ms
  significance: 1 | 2 | 3 | 4 | 5;
}
export interface LightPlacement {
  id: string;
  x: number;
  y: number;
  z: number; // Rail axis; travel direction is -z (forward in time)
  t: number; // 0 oldest .. 1 newest, drives Doppler color
  size: number;
}

export const LAYOUT = {
  unitsPerOrdinal: 1.6,
  unitsPerYear: 6,
  maxGapUnits: 10,
  chapterRadius: 9,
  scatter: 2.2,
  minSeparation: 0.9,
  relaxNeighbours: 12,
} as const;

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** FNV-1a 32-bit hash. Stable across runtimes. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG returning floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Deterministic layout: same inputs and worldSeed always produce the same sky. */
export function layoutLights(
  inputs: readonly LightInput[],
  chapterCount: number,
  worldSeed: string,
): LightPlacement[] {
  const sorted = [...inputs].sort((a, b) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : 1));
  if (sorted.length === 0) return [];
  const t0 = sorted[0]!.occurredAt;
  const span = sorted[sorted.length - 1]!.occurredAt - t0;
  const out: LightPlacement[] = [];
  let z = 0;
  sorted.forEach((m, i) => {
    if (i > 0) {
      const gapYears = (m.occurredAt - sorted[i - 1]!.occurredAt) / YEAR_MS;
      z -= LAYOUT.unitsPerOrdinal + Math.min(gapYears * LAYOUT.unitsPerYear, LAYOUT.maxGapUnits);
    }
    const rand = mulberry32(hash32(worldSeed + m.id));
    let cx = 0;
    let cy = 0;
    if (m.chapterIndex >= 0) {
      const cRand = mulberry32(hash32(worldSeed + "chapter" + m.chapterIndex));
      const angle = (2 * Math.PI * m.chapterIndex) / Math.max(chapterCount, 1) + cRand() * 0.6;
      const radius = LAYOUT.chapterRadius * (0.35 + 0.65 * cRand());
      cx = Math.cos(angle) * radius;
      cy = Math.sin(angle) * radius * 0.6;
    }
    let x = cx + gaussian(rand) * LAYOUT.scatter;
    let y = cy + gaussian(rand) * LAYOUT.scatter * 0.7;
    for (let k = out.length - 1; k >= Math.max(0, out.length - LAYOUT.relaxNeighbours); k--) {
      const p = out[k]!;
      if (Math.abs(p.z - z) > LAYOUT.minSeparation) break;
      const dx = x - p.x;
      const dy = y - p.y;
      const d = Math.hypot(dx, dy, p.z - z);
      if (d < LAYOUT.minSeparation) {
        const ang = rand() * 2 * Math.PI;
        x += Math.cos(ang) * (LAYOUT.minSeparation - d);
        y += Math.sin(ang) * (LAYOUT.minSeparation - d);
      }
    }
    out.push({
      id: m.id, x, y, z,
      t: span === 0 ? 0.5 : (m.occurredAt - t0) / span,
      size: 0.5 + 0.35 * (m.significance - 1),
    });
  });
  return out;
}

const RAMP: ReadonlyArray<readonly [number, [number, number, number]]> = [
  [0, [0xe3, 0x9a, 0x55]],
  [0.5, [0xf0, 0xd3, 0xa6]],
  [1, [0xf7, 0xf2, 0xe8]],
];
/** Doppler color ramp: amber (old) to candle white (frontier). Returns 0..255 RGB. */
export function rampColor(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i]!;
    const [t0_, c0] = RAMP[i - 1]!;
    if (c <= t1) {
      const f = (c - t0_) / (t1 - t0_);
      return [0, 1, 2].map((k) => Math.round(c0[k]! + (c1[k]! - c0[k]!) * f)) as [number, number, number];
    }
  }
  return [...RAMP[RAMP.length - 1]![1]] as [number, number, number];
}
```

Rules: memories sorted by `occurredAt`; long gaps are compressed (`maxGapUnits`); chapters occupy angular sectors around the Rail (x/y clusters) so that constellations are spatially coherent; `worldSeed` is a stored site constant (`site_texts.world_seed`, generated once) so layout is stable across devices. Author overrides: `layout_hint {dx,dy}` per memory (clamped ±3 units). Unlit entries continue past the Frontier at `z = zFrontier − k·4` with a steel-blue tint. The **Frontier** is the z of the newest published memory.

## 6.4 Camera
- `PerspectiveCamera`, near 0.1, far 400. Vertical FOV computed from a target **horizontal** FOV of 70° (landscape) so portrait phones are not zoomed in: `vfov = 2·atan(tan(hfov/2)/aspect)`, clamped 50–75°.
- **RailCamera** position = `rail(u)` (Catmull-Rom through per-chapter waypoints, centripetal) + look offset + breath (±0.03 units, 7 s). Look limits: yaw ±28°, pitch ±16°. Travel speed cap: 14 units/s. All input feeds a target `(u, yaw, pitch)`; the camera follows through a critically damped spring (`motion.camera.dampingSeconds`).
- **Focus pose:** stop 3.0 units before the light on the Rail axis, offset 0.9 units left (panel side), looking at it; 900 ms. Return: 700 ms to the stored pre-focus pose.
- Touch: vertical drag = travel (`Δy · 0.02 · unitsPerPx`), horizontal = look (spatial-touch only); momentum inertia 0.92/frame-normalized.

## 6.5 Materials and shaders
| Material | Vertex | Fragment |
|---|---|---|
| **Light** (instanced quad, billboard) | position from `aPosition`; size = `aSize · uScale · attenuate(distance)`; twinkle = `1 + 0.04·sin(uTime·aSeed…)` unless reduced motion | core `pow(1 − r, 2.2)` soft disc; milestone (significance ≥ 4) adds a faint 4-point diffraction cross; hover/focus ring from `aState`; color = ramp(`aT`) in-shader (3 constants); alpha × `uExposure` × distance fade |
| **Field star** | points, size 1–2.2 px × DPR, 3 shells with depth-scaled parallax | round, alpha 0.15–0.6 |
| **Constellation line** | per-vertex `aArc` 0..1 | alpha `smoothstep` on `aArc < uProgress`, base alpha 0.22, color `scene.constellationLine` |
| **Unlit ring** | billboard | ring `abs(r − 0.7) < 0.04`, alpha 0.35, `future` color; never animated |
Additive blending, `depthWrite=false`, `transparent`, sorted by construction (z order). Output linear→sRGB in shader; `renderer.toneMapping = NoToneMapping`.
**Exposure (R5):** `uExposure` ∈ [0.55, 1.0]; after 6 s without input it eases to 1.0 over 8 s; any input eases toward 0.75 over 1.5 s. Significance-1 lights have base alpha × `smoothstep(0.7, 1.0, uExposure)`, i.e. they appear only in stillness. They remain reachable via keyboard/Logbook at all times.

## 6.6 Post-processing (pmndrs `postprocessing`, merged into one `EffectPass`)
Bloom (luminance threshold 0.35, intensity 0.6, radius 0.7, mipmap blur), Vignette (offset 0.3, darkness 0.5), Noise/grain (opacity 0.025, `Medium+` only). **Low tier: no composer**; bloom is faked with a second, larger, dimmer additive sprite per light.

## 6.7 Quality tiers
| Tier | DPR cap | Field stars | Max lights drawn | Post | AA | Frame target | Notes |
|---|---|---|---|---|---|---|---|
| Ultra | 2.0 | 4,000 | all | Bloom+Vignette+Grain | MSAA 4 (WebGL2) | 60 | dust 600 |
| High | 1.75 | 2,500 | all | Bloom+Vignette+Grain | MSAA 2 | 60 | dust 300 |
| Medium | 1.5 | 1,200 | all (significance ≥ 2 beyond 60 units) | Bloom+Vignette | none | 45+ | dust 120 |
| Low | 1.0 | 500 | significance ≥ 2 beyond 40 units | none (fake bloom) | none | 30 | no dust; loop throttled to 30 fps |
| Reduced motion | tier by device | as tier | as tier | as tier minus grain | as tier | static frames | no drift/twinkle/exposure ramp; camera cross-fades |
| Flat (no WebGL2 / lost) | — | pre-rendered AVIF backdrop | — | — | — | CSS | Rail is a DOM timeline |
**Tier selection:** initial guess from `hardwareConcurrency`, `deviceMemory` (where exposed), coarse-pointer, screen size, WebGL2 max texture size and renderer string (local only, never transmitted). Then a **runtime governor**: sample frame time over 2 s windows; if p75 > 1.25× target for two windows step down one tier; step up at most once per session and only after 20 s stable. Choice cached in `localStorage` (non-sensitive). No third-party GPU database.

## 6.8 Interaction zones and picking
- **Picking:** screen-space nearest-neighbor over projected light positions (spatial hash, cell = 32 px), hit radius `max(24 px, projectedSize)`, 44 px on coarse pointers. No GPU picking pass; no raycast against geometry. Hover changes `aState` on a single instance.
- **Chapter zones:** axis-aligned volumes along the Rail; entering (distance < 10 units to the chapter's cluster centroid, with 2-unit hysteresis) emits `chapterEnter` (lines draw over 600 ms, DOM title appears). Leaving reverses.
- **Dwell:** 1.5 s of hover on a light shows its title as a DOM tooltip (no scene text rendering, so text is accessible and crisp).

## 6.9 Resource management (§28)
- **ResourceTracker:** every `BufferGeometry`, `Material`, `Texture`, `WebGLRenderTarget`, composer pass registers on creation; `dispose()` walks and disposes; unit test asserts `renderer.info.memory` returns to baseline after `dispose()` and after 50 open/close cycles of a memory.
- **Pooling:** constellation line buffers (fixed 64 chapters × 128 segments), DOM tooltip nodes, tween objects. Zero allocations in the frame loop (checked with a dev-only allocation counter in tests).
- **Lifecycle:** pause on `visibilitychange`; idle throttle to 15 fps for ambient-only frames after 20 s without input (R5 silence also saves battery); `webglcontextlost` → prevent default, emit `contextLost`, machine goes `flat`; `webglcontextrestored` → rebuild from stored world data.
- **Budgets:** ≤ 40 draw calls (desktop), ≤ 20 (mobile); ≤ 96 MB GPU (Ultra) / ≤ 32 MB (Low); ≤ 4 ms CPU/frame scene work on mid-tier mobile.

## 6.10 Lamp Room and Unlit stage details
**LampStage:** static camera; one warm point-glow quad (`lampGlow`), dust motes (Medium+), a very slow 0.5% intensity breath. Letters are DOM. Transition SkyStage → LampStage: exposure ramps to 1.0 and the world's `uWarmth` uniform lerps the ramp toward amber over 900 ms; audio bed crossfades (Doc 07). **Unlit:** the Rail spline extends 40 units past the Frontier; ending sequence timings in Doc 03 Act VII are driven by the machine, not by the engine.

## 6.11 Testing hooks
`?seed=` and `?freeze=<ms>` are honored **only** in development builds (stripped in production) to make visual tests deterministic. The engine exposes `getStats()` (draw calls, triangles, memory, frame p50/p95).
