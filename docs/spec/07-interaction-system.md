# 07 — INTERACTION SYSTEM

## 7.1 Interaction matrix (trigger → response → state → alternatives)
| # | Interaction | Trigger (desktop / mobile) | Visual response | Audio | State change | Accessibility alternative | Mobile alternative |
|---|---|---|---|---|---|---|---|
| 1 | Hover/focus a light | pointer near / — ; Tab in Logbook list | Ring appears, title tooltip after 1.5 s | soft tick (−30 dB) if sound on | `hover(id)` event only | Focusing the DOM list item does the same | Long-dwell not used; tap selects |
| 2 | Select a light | click / tap | Camera focus (900 ms), Unfold to panel, scene dims 35% | low "arrival" tone | `memory` (id) | Enter on list item | Tap |
| 3 | Look | drag / horizontal drag (spatial-touch) | Yaw/pitch with damping | — | none | Arrow keys ←→↑↓ | Disabled in `guided-mobile` |
| 4 | Travel | wheel, arrow ↑↓, PageUp/Down / vertical swipe | Rail motion with inertia | ambience crossfades by chapter | `railPosition` | Rail scrubber (range input), Logbook | Scrubber + swipe |
| 5 | Chapter proximity | camera distance | Lines draw, title appears (aria-live) | bed crossfade 2 s | `chapterEnter` | Chapter headings in DOM mirror | same |
| 6 | Scrub the Rail | drag/click scrubber | Fast travel (≤ 1.2 s, eased) | none | `railPosition` | Arrow keys on focused range | Touch drag |
| 7 | Close memory | Esc / close / click sky | Reverse Unfold, camera returns 700 ms | — | back to `exploration` | Esc; focus returns to the light's DOM anchor | swipe-down sheet |
| 8 | Open media | click asset | Viewer opens (§7.6) | — | `viewer` | Enter; focus trap | tap |
| 9 | Break a seal | press-and-hold 800 ms (or Enter held) | Seal fills, opens | paper sound | `POST /letters/:id/open` | Button with `aria-describedby`; alternative single activation after confirm dialog | hold |
| 10 | Keep (favorite) | K / tap Keep | Icon fills, toast "Kept" | — | `PUT /favorites` | Button `aria-pressed` | same |
| 11 | Search | `/` or Logbook field | Instant results (debounce 250 ms) | — | none | Native input, `role=search`, results `aria-live` | same |
| 12 | Sound | S / toggle | icon state | fade 400 ms | `audio.enabled` | Button `aria-pressed` | same |
| 13 | Rest | R / Rest | 2 s fade to black, GPU released | fade out | `rest` | Button | same |
| 14 | Quality change | Menu → Quality | Tier switch, no reload | — | `tier` | Select | same |
| 15 | Leave (log out) | Menu → Sign out | Fade to Veil, caches purged | — | `loggingOut` | Button | same |

**Gesture thresholds:** tap ≤ 10 px movement and ≤ 250 ms; drag begins > 6 px; no long-press gestures; pinch-zoom is allowed only inside the Media Viewer (`touch-action: none` on canvas, `pan-y` on panels). Pointer Events only (no separate mouse/touch code paths).

## 7.2 Camera input mapping
Wheel `deltaY` normalized (line/page → px), scaled 0.012 units/px; trackpad inertia is detected and not double-applied. Keyboard: ↑/↓ = travel 2 units (Shift = 8); ←/→ = look 4°; Home/End = first light/Frontier.

## 7.3 Feedback principles
Every interaction has a visible response ≤ 100 ms (hover ring, pressed state); heavy work (network) shows calm placeholders, never spinners on the sky.

## 7.4 Memory timeline model (§25)
The API returns `MemorySummary` for the whole world in one call (no sealed text) and `Memory` on demand. Shapes in Doc 21. Content is never compiled into the frontend; the client only holds what the current session was authorized to read, in memory (TanStack Query cache with `gcTime` 10 min), never persisted.

## 7.5 Audio system (§23)
| Aspect | Spec |
|---|---|
| Creation | `AudioContext` is created only on the first user gesture (Veil press) — never before. Default off (`audio.enabledByDefault=false`); Threshold offers "Enter with sound / in silence" |
| Buses | `master → music (bed) · ambience (per chapter) · sfx · voice (memory audio)`; a single compressor on master |
| Loudness | Bed −18 LUFS, ambience −24, sfx peak −12 dBFS; ducking of music/ambience by −12 dB while a voice clip plays (attack 200 ms, release 900 ms) |
| Crossfades | `GainNode.setTargetAtTime`, τ = 0.7 s between chapter beds; 2 s on Lamp Room entry |
| Assets | Long beds streamed via `<audio>` → `MediaElementAudioSourceNode`; SFX ≤ 200 KB decoded once. Formats: AAC-LC `.m4a` (universal) plus Opus/WebM where supported. Generic beds are static assets; **personal songs are private media assets** (signed URL, recipient-only) and must be licensed/original (A-10) |
| Mobile | Resume on gesture after interruption; on `visibilitychange` fade out over 400 ms and `suspend()`; honor iOS silent-switch quirks by using the media element path for beds |
| Accessibility | Sound never carries information; spoken audio always has a transcript/captions; toggle reachable by keyboard |
| Failure | Autoplay/blocked or decode error → stay silent, no error UI beyond the toggle state |

## 7.6 Media Viewer (§24)
Full-screen `<dialog>`-style overlay (`role="dialog"`, `aria-modal`, focus trap, focus returns on close). Zoom 1–5× (wheel, pinch, double-tap, `+`/`−`), pan when zoomed, swipe/←→ between assets, `Esc` closes. Header: date (precision-aware) and caption; footer: position "3 of 12". Video: native `<video controls playsinline preload="metadata">` with poster and `<track kind="captions">` when present; audio: native controls. Loading: blur placeholder (LQIP) → `display` variant; **zoom loads the `zoom` variant on demand**. Signed URLs are requested per variant via `POST /api/v1/media/access` and auto-refreshed on 403/expiry (resume at `currentTime`). Failure: placeholder with retry. Raw storage paths and object keys are never rendered or logged. Reduced motion: no zoom animation, instant swap.

## 7.7 Keyboard map
`Tab` order: skip link → Rest/Sound/Menu → scrubber → panel. `Space/Enter` activate; `Esc` closes topmost layer; `/` search; `K` keep; `S` sound; `R` rest; `?` shortcut list. All shortcuts are ignored while typing in inputs.
