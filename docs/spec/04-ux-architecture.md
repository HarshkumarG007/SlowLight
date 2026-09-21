# 04 — UX ARCHITECTURE

## 4.1 Information architecture
Layers, outermost first: **Sky** (spatial world) → **Chapter** → **Memory (Unfold)** → **Media Viewer**; parallel rooms: **Lamp Room**, **Logbook**, **Unlit**, **Security page**. **Admin** is a separate application (§4.10).

## 4.2 Three equivalent navigation systems (all always available)
1. **Spatial:** travel/look/tap lights.
2. **Rail scrubber:** a thin horizontal time line at the bottom with chapter ticks and a "you are here" mark; drag/tap/arrow to jump. It is a real `<input type="range">` with `aria-valuetext` "March 2021, chapter [NAME]".
3. **Logbook & keyboard:** DOM list mirrored from the same data; focusing an item flies the camera there.

## 4.3 Routes (SPA; every route `noindex`)
| Route | Auth | Machine state |
|---|---|---|
| `/` | none (renders Veil or resumes) | `veil`/`threshold` |
| `/enroll#t=<token>` | invite (fragment never sent to server/logs) | `veil.enrolling` |
| `/world`, `/world/c/:slug`, `/world/m/:id` | recipient/author | `sanctuary.*` |
| `/letters`, `/letters/:id` | same | `sanctuary.letters` |
| `/logbook` | same | `sanctuary.archive` |
| `/unlit` | same | `sanctuary.future` |
| `/settings/security` | same (step-up for changes) | overlay |
| Admin host `/` … | author + elevation | separate app |

## 4.4 HUD (desktop)
```
┌──────────────────────────────────────────────────────────────┐
│ Rest                                              Sound  Menu │
│                                                                │
│                       (the sky)                                │
│                                                                │
│         ─────●────────|───────────|──────  now  ···           │
│   rail scrubber (bottom center; ticks = chapters)             │
└──────────────────────────────────────────────────────────────┘
Memory Panel (right, 420–520 px, tall column; sky stays visible left)
```
Mobile (guided): full-height sky; rail scrubber pinned at bottom (safe-area aware); Memory Panel is a bottom sheet (peek 30%, expanded 92% `dvh`), drag handle, swipe-down to close. Menu opens a sheet with Logbook, Letters, Unlit, Security, Sound, Rest.

## 4.5 Responsive modes (chosen by capability, not only width)
| Mode | When | Behavior |
|---|---|---|
| `spatial-desktop` | fine pointer, ≥ 1024 px, WebGL2 | Free look + travel; panel docks right |
| `spatial-touch` | coarse pointer, ≥ 768 px | Vertical drag = travel, horizontal = look; panel docks right or bottom by orientation |
| `guided-mobile` | coarse pointer, < 768 px | Travel by vertical swipe and scrubber; no free look (optional gyro parallax, permission-gated, off by default); tap lights with 44 px hit radius |
| `flat` | no WebGL2, Low-memory, or user choice | Pre-rendered CSS sky backdrop; Rail as horizontal timeline; everything else identical |
Use `100dvh`, `env(safe-area-inset-*)`, `touch-action: none` on canvas and `pan-y` on panels, `viewport-fit=cover`; handle orientation change by re-fitting camera FOV (Doc 06 §6.4). Audio and autoplay obey Doc 07 §7.5.

## 4.6 Memory presentation
Fields shown: title, subtitle, "left X ago" + full date (precision-aware), story (sealed-text renderer), assets, place label (no map in v1), chapter name. Tags and `emotion` are **not** displayed; `emotion` selects the ambience bed only. Prev/next (chronological) at panel foot.
Story text format ("SL-text"): paragraphs, line breaks, `*italic*`, and `---` scene break. **No HTML, no links, no inline images.** Rendered by a first-party parser to React elements.

## 4.7 Empty and edge states
No memories yet (Author preview): the Unlit only, copy "Nothing has arrived yet." · Locked letter: date/“not yet” (never a countdown timer). · No search results: "Nothing matches. Try fewer words." · Session ended: fade to Veil, no data retained.

## 4.8 Accessibility architecture (§30)
- The 3D canvas is `aria-hidden`; a real DOM mirror (`<nav aria-label="Memories">`, chapters as `<section>` headings) exists at all times and is reachable via skip link "Skip to memories".
- Keyboard: full operation (Doc 07 §7.7). Focus is trapped in dialogs, returned to the invoking element on close.
- `prefers-reduced-motion`: no drift/twinkle/exposure ramp; camera moves become 200 ms cross-fades; Threshold becomes a 1 s fade. `prefers-reduced-transparency` and `prefers-contrast: more` swap tokens (Doc 22).
- Contrast ≥ 4.5:1 text, 3:1 UI; focus ring 2 px, offset 2 px, ≥ 3:1. Touch targets ≥ 44 px. Captions (WebVTT) for spoken audio/video; `alt` for every image (Author-required at publish).
- Screen readers: live region announces chapter entry and Unfold ("Opened: [title], [date]"). Motion never auto-plays media.

## 4.9 Failure experience (§34)
| Failure | Behavior |
|---|---|
| Offline | State `offline`; HUD dims; "The connection dropped. We will reconnect." Retries with backoff; loaded content stays |
| Video/image fails | Poster/blur placeholder + "This didn't load. Try again." with retry; never a raw error or URL |
| Auth expired | Fade to Veil; unsaved favorite toggles retried after login |
| API down (5xx) | Calm full-screen "The sky is resting. Try again in a few minutes." |
| Storage unavailable | Text loads, media shows placeholder; retry with fresh signed URL |
| No WebGL / context lost | Switch to `flat` without reload; preserve position |
| Autoplay blocked | Sound toggle shows "Sound is off"; play only on gesture |
| Low memory | Drop one quality tier; if still failing, `flat` |

## 4.10 Admin console (§26)
Separate SPA entry, separate host, plain and efficient (no cinematic chrome). Features: memory editor (title, dates with precision, story, chapter, kind, significance, emotion, tags, place, assets ordered with captions/alt, status draft/scheduled/published/archived), chapter editor with drag-ordering, letter editor (unlock mode/date/seal ceremony), future entries, media uploader with processing status, site texts, invites/devices/sessions, audit viewer, **Preview as Recipient** (audited). Destructive actions: type-to-confirm + step-up + 30-day trash. Optimistic concurrency via `version` (If-Match). Security in Doc 10 §10.8.
