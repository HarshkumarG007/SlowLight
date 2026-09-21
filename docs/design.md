# design.md — Design System
Prevents random UI generation. Machine-readable source: `packages/tokens/tokens.json` (spec 22). Rationale: spec 05. **Boldness lives in one place: the light. Everything else is quiet.**

## 1. Principles
1. Emotion before information. 2. Mystery before explanation. 3. Motion answers input, plus one orchestrated moment (the Threshold). 4. Restraint. 5. Silence and empty space are features. 6. Every visual rule traces to the physics of Slow Light: distance = time; warm = old, cool = future; brightness = significance; constellations are chosen; stillness reveals; one warm room; the frontier moves.

## 2. Color (night theme; lamp theme for letters)
| Token | Night | Lamp |
|---|---|---|
| background | #050814 | #120D08 |
| surface / surfaceElevated | #0C1120 / #141B2D | #1B140D / #261C12 |
| textPrimary / Secondary / Muted | #ECE6D8 / #B9B5AA / #8F95A6 | #F1E4CC / #CDBB9C / #A39178 |
| primary (actionable) | #E4B07A | #EBB874 |
| secondary (future/unlit only) | #8CB0D8 | #9DB8D6 |
| accent (focus, Threshold glow) | #F4EBD9 | #F6E9CF |
| border / borderStrong | #232C42 / #5F6B85 | #3A2C1C / #7A6647 |
| success / warning / danger | #7DBE9C / #E0BE5C / #E5786D | #86C4A0 / #E6C465 / #EC8378 |
Light color by time: amber #E39A55 → candle #F0D3A6 → white #F7F2E8 (oldest → frontier); future #8CB0D8. Contrast verified: text ≥ 6:1, UI boundary ≥ 3:1.

## 3. Typography (self-hosted WOFF2, OFL)
- **Newsreader** (variable, optical size) — display, titles, stories, letters. **Atkinson Hyperlegible Next** — interface, metadata, errors. No monospace in product UI.
- Scale: display clamp(3rem,9vw,7.5rem)/0.98 weight 300 · title clamp(2rem,4.2vw,3rem) · heading 1.625rem · reading 1.1875rem/1.75 · body 1.0625rem/1.65 · ui 0.9375rem · meta 0.8125rem. Measure ≤ 62ch, left-aligned, never justified. Dates are sentence case with tabular figures ("14 February 2021"); relative time in world voice ("left 3 years 7 months ago").
- Fallbacks: serif stack (Iowan Old Style, Palatino, Georgia); system-ui sans.

## 4. Spacing, shape, depth
Spacing 4px base: 0, .25, .5, .75, 1, 1.5, 2, 3, 4, 6, 8 rem. Radius: control .5rem, panel 1rem, sheet 1.5rem, media .25rem, pill 999px. Shadows: subtle, elevated, cinematic, glow. Blur only behind the Memory Panel; off under reduced transparency. z-index named layers only.

## 5. Motion
Durations: instant 80ms, quick 160, base 280, slow 480, camera 900, cinematic 2400. Easing: standard, emerge, settle, exit, breath. Camera moves are critically damped, never linear. Hover = color/opacity only. Reduced motion: 1ms durations, 200ms cross-fades, no ambient/exposure ramp.

## 6. Layout and components
Asymmetric, left-weighted; sky fills the viewport; HUD hugs edges and fades to 25% after 4s idle. Memory Panel: one tall column (420–520px desktop; bottom sheet on mobile, peek 30%/expanded 92dvh). Assets: one horizontal strip, not a card grid. Rail scrubber: thin time line with chapter ticks (real range input). Buttons: text-first; one primary fill per view. Focus ring 2px `accent`, offset 2px, never removed. Touch targets ≥ 44px. Icons: ≤ 12 custom stroke SVGs; no icon fonts/emoji. Photos unfiltered, `object-fit: contain`, 1px border.

## 7. Voice
World voice: sparse, physical, declarative, no exclamation marks. Interface voice: plain verbs, specific errors, no apology, never "Oops". Personal strings come from `site_texts`, never code.

## 8. Banned
Eyebrow/ALL-CAPS tracked labels · middle-dot meta strings · "→" on buttons · identical rounded card grids · gradient washes · glassmorphism elsewhere · one-word italic accents in headings · fade-slide-up everywhere · hover lift/scale · emoji as UI · hearts, roses, confetti, "days together" counters.
