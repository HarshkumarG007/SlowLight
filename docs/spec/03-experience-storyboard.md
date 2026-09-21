# 03 — EXPERIENCE STORYBOARD

Session arc: Veil (≈5 s) → Threshold (≤ 8 s, skippable, first visit of a session only) → World (open-ended) → optional Lamp Room / Logbook / Unlit → Rest. Exactly **one** orchestrated non-interactive sequence exists per session: the Threshold. Ambient life (twinkle, drift) is imperceptible and stops under reduced motion.

| Act | Machine state | Purpose |
|---|---|---|
| I The Veil | `veil` | Identity, atmosphere, privacy, anticipation |
| II The Threshold | `threshold` | The world recognizes her |
| III The World | `sanctuary.exploration` | Spatial exploration |
| IV The Constellations | `…chapterFocus`, `…memory`, `…viewer` | Milestones and media |
| V The Letters | `sanctuary.letters` | Intimate writing |
| VI The Archive | `sanctuary.archive` | Practical vault |
| VII The Future | `sanctuary.future` | What is unwritten |

## Act I — The Veil
- **See:** black; one light at center, breathing (period 6 s, amplitude 8%). No logo, no name, no personal data.
- **Hear:** nothing (audio context not yet created).
- **Do:** press/tap anywhere or Enter. Line appears: *"Let your eyes adjust."* while the passkey prompt opens (authentication doubles as the ritual).
- **Rules:** loads < 120 KB gz JS; no calls except `GET /api/v1/session`. Toggle "This isn't my device" → ephemeral session (Doc 16).
- **Variants:** reduced motion = light static; no WebGL = CSS radial light; failure = calm text, retry (Doc 04 §4.9).

## Act II — The Threshold
| t | Visual | Audio | Copy |
|---|---|---|---|
| 0–1.5 s | Field stars fade in as dark adaptation begins | Sound choice: "Enter with sound / in silence" (first gesture creates AudioContext) | — |
| 1.5–4 s | Camera drifts back from the first light; amber lights emerge along the Rail | Ambient bed fades in (−30 → −18 LUFS over 3 s) if sound chosen | `threshold.greeting` |
| 4–7 s | Camera settles at "First light" (earliest memory); HUD fades in last | — | — |
| ≥ 7 s | Skippable at any time (tap/Esc) | | |
Returning visit with a valid session: 2 s version, no greeting. If the Author lit something since her last visit (`user_state.last_seen_world_at`), that one light pulses once.

## Act III — The World
Travel forward through time by scrolling/dragging/arrow keys; look around ±28° yaw, ±16° pitch. Past recedes behind (redder), future approaches (bluer). Chapter names fade in only on proximity and out again; they never persist. After 6 s idle, exposure rises: faint (significance 1) lights appear. Any input eases exposure back down over 1.5 s.

## Act IV — The Constellations
1. Approach a Chapter cluster: its lines *draw* (600 ms) and the title appears (DOM, aria-live polite).
2. Tap/click a light: camera eases to a focus pose (900 ms); the light **unfolds** (FLIP animation) into the Memory Panel: title, "This light left 3 years 7 months ago", story, assets, place label. The scene behind dims 35% and slows.
3. Open media: Media Viewer (Doc 07 §7.6). Closing reverses the Unfold and returns the camera.
- Panel layout: measure ≤ 62 ch; text left-aligned; assets in a horizontal strip, not a card grid.

## Act V — The Letters (Lamp Room)
Reached from the HUD. Transition: exposure lifts to warm; the sky recedes into a window. A desk lit by one lamp; dust motes (Medium+ tiers). Letters list as paper: **open**, **sealed** (requires breaking the seal — a deliberate press-and-hold of 800 ms), **timed** (shows date; server refuses body until then), **held** (Author-released; shown only as "not yet"). Reading is DOM text (selectable, 19 px, 1.75 line-height, ≤ 62 ch). Leaving the room reverses the exposure.

## Act VI — The Archive (Logbook)
Flat, calm, warm-on-dark reading page: filter by chapter, tag, kind, year, kept; search text. Rows are memories; opening one goes to the same Memory Panel content. It is the complete accessible equivalent of the sky.

## Act VII — The Future (Unlit)
The Rail ends past the Frontier. Hollow rings in steel-blue: promises, places, plans, dreams, blank chapters (`future_entries`). Approaching a ring shows its title and target date; nothing pulses. At the end of the Rail the ambient bed thins to a single sustained tone; after 4 s the line `unlit.closing` appears; after 8 s more, the newest light dims 5% and the nearest ring brightens 3% — no text. No "I love you", no call to action. Ending state persists until she moves or presses Rest.

## Cross-cutting
- **Rest:** HUD control "Rest" → 2 s fade to black, session kept, audio released, GPU context disposed. Reopening lands at the last position.
- **Two silences:** Threshold hold (t 4–7 s) and the Unlit ending. No sound cue or UI is permitted in them.
- **Shot list format** for the Designer: Time | Visual | Audio | Interaction | Copy (as above).
