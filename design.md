# design.md — Design System
Prevents random UI generation. Machine-readable source: `packages/tokens/tokens.json` (spec 22). Rationale: spec 05. **Boldness lives in one place: the light. Everything else is quiet.**

## 1. Principles
1. Emotion before information. 2. Mystery before explanation. 3. Motion answers input, plus one orchestrated moment (the Threshold). 4. Restraint. 5. Silence and empty space are features. 6. Every visual rule traces to the physics of Slow Light: distance = time; warm = old, cool = future; brightness = significance; constellations are chosen; stillness reveals; one warm room; the frontier moves.

## 2. Color (night theme; lamp theme for letters room)
| Token | Night | Lamp |
|---|---|---|
| background | #050814 | #120D08 |
| surface / surfaceElevated | #0C1120 / #141B2D | #1B140D / #261C12 |
| textPrimary / Secondary / Muted | #ECE6D8 / #B9B5AA / #8F95A6 | #F1E4CC / #CDBB9C / #A39178 |
| primary (actionable) | #E4B07A | #EBB874 |
| secondary (future/unlit only) | #8CB0D8 | #9DB8D6 |
| accent (focus ring, Threshold glow) | #F4EBD9 | #F6E9CF |
| border / borderStrong | #232C42 / #5F6B85 | #3A2C1C / #7A6647 |
| success / warning / danger | #7DBE9C / #E0BE5C / #E5786D | #86C4A0 / #E6C465 / #EC8378 |

Light color by time (Doppler ramp): amber #E39A55 (oldest) → candle #F0D3A6 → white #F7F2E8 (frontier); future lights #8CB0D8. Contrast verified: text ≥ 6:1, UI boundary ≥ 3:1 (WCAG 2.2 AA minimum is 4.5:1 / 3:1).

Scene-only colors (not for UI): void/fog #050814 · lampGlow #F2B66D · constellationLine #F0D3A6.

## 3. Typography (self-hosted WOFF2 variable fonts, OFL licensed)
- **Newsreader** (variable, optical size) — display, titles, stories, letters. **Atkinson Hyperlegible Next** (variable) — interface, metadata, errors. No monospace in product UI.
- Scale: display `clamp(3rem,9vw,7.5rem)` / lh 0.98 / weight 300 · title `clamp(2rem,4.2vw,3rem)` / lh 1.12 · heading `1.625rem` / lh 1.2 · reading `1.1875rem` / lh 1.75 · body `1.0625rem` / lh 1.65 · ui `0.9375rem` · meta `0.8125rem`. Measure ≤ 62ch reading / ≤ 48ch ui. Left-aligned, never justified.
- Dates: sentence case with tabular lining figures (`'tnum' 1, 'lnum' 1`): "14 February 2021". Relative time in world voice: "left 3 years 7 months ago". Story/letter text uses oldstyle figures + kerning (`'onum' 1, 'kern' 1`).
- Fallbacks: serif stack (Iowan Old Style, Palatino Linotype, Georgia); system-ui sans. WOFF2 only; `font-display: swap`; preload the two variable files.

## 4. Spacing, shape, depth
Spacing (4px base): 0 / 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 / 6 / 8 rem. Radius: control 0.5rem · panel 1rem · sheet 1.5rem · media 0.25rem · pill 999px. Shadows: subtle (`0 1px 2px rgba(2,4,10,0.5)`) · elevated · cinematic · glow (`0 0 24px 2px rgba(228,176,122,0.28)`). Blur only behind the Memory Panel (16px medium); off under `prefers-reduced-transparency`. Z-index: named layers only (scene 0 · sceneOverlay 10 · hud 20 · panel 30 · viewer 40 · modal 50 · toast 60 · veil 70 · skipLink 80).

## 5. Motion
Durations: instant 80ms · quick 160ms · base 280ms · slow 480ms · camera 900ms (focus), 700ms (return) · cinematic 2400ms. Easing: standard `cubic-bezier(0.2,0,0,1)` · emerge · settle · exit · breath. Camera moves are critically damped (dampingSeconds=0.35, inertia=0.92), never linear. Hover = color/opacity only — no scale/lift. **Reduced motion:** all durations → 1ms; cross-fades 200ms; no ambient drift, no exposure ramp. Memory Panel Unfold uses FLIP via Web Animations API (`element.animate()`). No Framer Motion or GSAP.

## 6. Layout and components
- Sky fills the full viewport; the browser chrome and HUD are guests in the sky, not containers around it.
- HUD hugs edges; fades to 25% opacity after 4s idle input; fully visible on focus/hover.
- **Memory Panel:** one tall column, 420–520px on desktop; bottom sheet on mobile (peek 30% / expanded 92dvh). Contains: title, date, story (SL-text), place label, assets strip, prev/next navigation.
- **Asset strip:** a single horizontal strip of media thumbnails — never a card grid.
- **Rail scrubber:** a thin `<input type="range">` time-line with chapter tick marks.
- Buttons: text-first; one primary fill per view maximum. Icons: ≤ 12 custom stroke SVGs — no icon fonts, no emoji in UI.
- **Photos:** `<img>` / `<video>` DOM elements (never WebGL textures), unfiltered, `object-fit: contain`, 1px `border` (`--sl-color-border`). `alt` text is required before publishing.
- Focus ring: 2px `accent` color, 2px offset, visible at all times — never removed (WCAG 2.2).
- Touch targets: ≥ 44px × 44px on all interactive elements.
- Breakpoints: sm 480px · md 768px · lg 1024px · xl 1440px · 2xl 1920px.

## 7. Voice
World voice: sparse, physical, declarative, no exclamation marks, no second person in descriptions. Interface voice: plain verbs, specific errors (not "Oops"), no apology. Personal strings (greetings, closing line) come from `site_texts` via API — never from code.

## 8. Banned
Eyebrow / ALL-CAPS tracked labels · middle-dot meta strings · "→" on buttons · identical rounded card grids · gradient washes · glassmorphism on anything except the Memory Panel blur · one-word italic accents in headings · fade-slide-up on every element · hover lift/scale · emoji as UI elements · hearts, roses, confetti, "days together" counters, streaks, read receipts, analytics nudges.
