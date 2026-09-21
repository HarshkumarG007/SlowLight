# 05 — VISUAL DESIGN SYSTEM

Tokens live in Doc 22; this document explains the choices and the rules for using them.

## 5.1 Design plan and review log
**Plan (first pass):** near-black background with amber accent; high-contrast display serif; monospace uppercase labels for dates and coordinates ("observatory log"); cards for memories; fade-and-slide entrances.
**Review against the brief — revised because each item was a default, not a choice:**
| First pass | Why rejected | Revision |
|---|---|---|
| Monospace ALL-CAPS date labels, "eyebrow" labels | Generic template chrome, not derived from this world | Dates are plain sentence-case text in the interface face with tabular figures: "14 February 2021"; relative time in the world voice: "left 3 years 7 months ago" |
| Card grid of memories | Identical rounded cards flatten the hierarchy | No cards. A single tall panel; assets in one horizontal strip; lights in the sky are the "objects" |
| Single amber accent on black | The "dark + one bright accent" default | Color is **information**: a three-stop Doppler ramp (amber → candle white → steel blue). The UI itself is almost colorless |
| Fade-slide-up on everything | Decorative motion | Motion only answers input, plus **one** orchestrated sequence (Threshold) |
| Display serif with one italic word | Headline tell | Titles are set whole, light weight, no accented word |

**Boldness is spent in one place: the light.** Everything else is quiet.

## 5.2 Color
Semantic tokens (Doc 22 `color.themes`): `background, surface, surfaceElevated, primary, secondary, accent, textPrimary, textSecondary, textMuted, border, borderStrong, focus, success, warning, danger`. Themes: **night** (sky, panels, Logbook) and **lamp** (Lamp Room only). Named base palette: Midnight `#050814`, Panel `#0C1120`, Paper-light `#ECE6D8`, Amber `#E4B07A`, Steel `#8CB0D8`, Candle `#F4EBD9`.

Verified contrast (WCAG 2.x, computed): night — textPrimary 16.1, textSecondary 9.8, textMuted 6.7, primary 10.3, secondary 8.9, danger 6.9 (on background); borderStrong 3.7 (UI boundary ≥ 3). Lamp — textPrimary 15.4, textMuted 6.3, primary 10.7. All text tokens ≥ 6:1.

Usage: `primary` = actionable/selected; `secondary` = future/unlit only; `accent` = focus and the single Threshold recognition glow; status colors only for status. Scene colors come from `timeRamp` (a light's color = ramp(t) where t is its normalized date; entries in the Unlit use `future`).

## 5.3 Typography
Two families, clearly distinct, both OFL and **self-hosted** (no font CDN):
- **Newsreader** (variable, optical size axis) — *voice*: display, titles, stories, letters. Optical sizing gives fine strokes at display sizes and sturdy ones at reading sizes. Weight 300 only at ≥ 48 px.
- **Atkinson Hyperlegible Next** — *interface*: controls, metadata, errors. Chosen for a reason: small text on dark backgrounds must stay legible for low-vision readers.
No monospace in the product (admin IDs may use `code`).
Scale: display `clamp(3rem,9vw,7.5rem)`; title `clamp(2rem,4.2vw,3rem)`; heading 1.625 rem; reading 1.1875 rem / 1.75; body 1.0625 rem / 1.65; ui 0.9375 rem; meta 0.8125 rem. Serif gets more leading than sans. Measure ≤ 62 ch for reading. Left-aligned; never justified; no all-caps labels.
Loading: WOFF2 subsets (Latin + Latin-ext), `font-display: swap`, preload only the two variable files, size-adjust fallback metrics to avoid layout shift.

## 5.4 Layout concept
Asymmetric, left-weighted: the sky fills the viewport; UI hugs edges and disappears when idle (HUD fades to 25% after 4 s without input, returns on move/focus). Panels are single columns. Alignment: left. Spacing scale Doc 22 `spacing` (4 px base). No dividers unless they encode structure (e.g., scene break `---` in stories).

## 5.5 Radii, shadows, blur, z-index
Radius is semantic: `control` 0.5 rem, `panel` 1 rem, `sheet` 1.5 rem, `media` 0.25 rem (photographs are barely rounded — they are records, not chips). Shadows: `subtle`, `elevated` (panel over sky), `cinematic` (viewer), `glow` (only around a focused light's DOM anchor). Blur (`soft|medium|heavy`) is used **only** behind the Memory Panel over the sky and disabled under `prefers-reduced-transparency`. z-index layers named in tokens; raw numbers forbidden.

## 5.6 Motion (§6)
| Category | Tokens | Rule |
|---|---|---|
| Response to input | `quick` 160 ms / `base` 280 ms, easing `standard` | Every user action shows what changed |
| State change (panel, sheet) | `slow` 480 ms, `emerge` / `settle` | Enter with `emerge`, exit with `exit` at 70% duration |
| Camera | `camera` 900 ms focus, 700 ms return; critically damped, 0.35 s | Never a linear tween |
| Orchestrated | Threshold ≤ 8 s (`cinematic`) | The only non-interactive sequence |
| Ambient | twinkle ≤ 4% intensity, drift ≤ 0.02 units/s | Off under reduced motion and when hidden |
Hover: color/opacity only (no lift, no scale). Scroll: never scroll-jacks the page; inside the world it maps to travel with inertia 0.92; panels scroll natively. Reduced motion: durations → 1 ms, camera moves → 200 ms cross-fade, no ambient, no exposure ramp.

## 5.7 Components
Buttons: text-first, `primary` fill only for the one main action per view; secondary = text with underline offset. Focus ring: 2 px `focus` color, 2 px offset, never removed. Inputs: `borderStrong` outline. Toasts: bottom-left, 6 s, `aria-live=polite`. Icons: ≤ 12 custom stroke SVGs (Close, Sound on/off, Menu, Rest, Prev, Next, Zoom in/out, Keep, Lock); no icon fonts, no emoji, no "→" appended to labels.

## 5.8 Imagery
Photographs are shown unfiltered at their aspect ratio (`object-fit: contain`), on `backgroundDeep`, with a 1 px `border`. No vignettes, frames, tilt or "polaroid" effects. Letter "paper" is a solid `surface` tone with generous padding — no textures.

## 5.9 Banned patterns (enforced by lint and review)
Eyebrow/ALL-CAPS tracked labels; middle-dot meta strings; "→" on buttons; identical rounded-card grids; gradient washes; glassmorphism outside §5.5; one-word italic/bold accents in headings; fade-slide-up on every section; hover lift/scale; emoji as UI; hearts/roses/confetti; counters ("days together").

## 5.10 CSS architecture
CSS Modules + tokens as custom properties. Cascade layers in fixed order `@layer reset, tokens, base, components, utilities;` so selector specificity never fights. No Tailwind, no CSS-in-JS runtime (CSP `style-src 'self'`), no inline `<style>`; dynamic values via `element.style.setProperty` (CSSOM is CSP-safe).
