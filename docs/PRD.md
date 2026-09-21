# PRD — Slow Light (Product Requirements Document)
Status: v1.0 · Owner: the Author · Source of truth for *what* and *why*. Detail lives in `docs/spec/` (numbers in brackets).

## 1. Product overview
Slow Light is a private, cinematic web sanctuary made for one person. Memories (dates, photos, videos, voice notes, letters, promises) appear as points of light in a night sky the Recipient explores by traveling through time. Two users only: the **Author** (curates) and the **Recipient** (visits). [01, 02]
Tagline: "Everything we were is still arriving."

## 2. Problem being solved
Relationship memories are scattered across chat apps and camera rolls, are easy to lose, and give no sense of a shared story. Generic galleries and wedding-site templates feel impersonal, and hosting intimate content casually is risky. Slow Light gives memories a *place* and keeps them private, recoverable, and never observed.

## 3. Target audience
- **Recipient (primary):** one person, non-technical, mostly on a phone. Needs: one-touch entry, calm exploration, accessible reading, no tracking of her.
- **Author (secondary):** technically capable; needs: add memories/letters without redeploying, schedule and time-lock content, manage her devices, sleep well about security and backups.
Non-audience: the public, search engines, other couples.

## 4. Goals and success criteria
| Goal | Measure |
|---|---|
| Feels intimate and personal | Author + Recipient walkthrough review [34]; no banned patterns [05 §5.9] |
| Private by construction | Zero third-party requests; sealed text at rest; server-side authz; passes security matrix [27] |
| Performs everywhere | Budgets met on all tiers incl. flat mode [28] |
| Recoverable | Restore drill meets RPO ≤ 5 min DB / ≤ 1 h media [30] |
| Accessible | WCAG 2.2 AA; full keyboard; DOM equivalent of the sky [04 §4.8] |

## 5. MVP scope (must ship)
1. **The Veil → Threshold:** passkey login, arrival sequence (skippable, once per session). [03, 16]
2. **The World:** 3D sky with time-ordered lights, chapters as constellations, rail scrubber, six quality tiers + flat mode. [06]
3. **Memory panel ("Unfold"):** title, date, story, place label, media strip, prev/next. [04 §4.6]
4. **Media viewer:** zoom, swipe, keyboard, captions, video/audio, graceful failure. [07 §7.6]
5. **Letters (Lamp Room):** open, timed, held, and seal-ceremony letters, enforced server-side. [17]
6. **Logbook:** search/filter/keep; complete accessible equivalent of the sky. [04]
7. **The Unlit:** future entries and the ending. [03 Act VII]
8. **Private media pipeline:** upload → sanitize → re-encode → signed same-origin access. [14]
9. **Admin console:** memories, chapters, letters, future, site texts, media, invites/devices, audit; behind the Admin Door. [04 §4.10, 10 §10.8]
10. **Security & recovery:** passkeys + Knock, RLS, sealed fields, audit, backups, offline archive. [10, 16, 30]
11. **Audio (opt-in):** ambient beds, sfx, crossfades, off by default. [07 §7.5]

## 6. Out of scope (v1)
Public pages, sharing, comments/replies, analytics, passwords/magic links, E2EE, maps, streaks/counters, read receipts, DRM. Extensions (replies, E2EE "Sealed Vault v2", DBSC, HLS, map) are Phase 12 behind ADRs. [25]

## 7. Key user stories
- As the Recipient, I touch once and the sky recognizes me.
- As the Recipient, I travel through time, open a light, and see photos/video with captions.
- As the Recipient, I open a letter only when it is meant to be opened; I can keep favorites; I can see and revoke my own devices.
- As the Recipient, I can trust that the Author cannot see what I open.
- As the Author, I add/schedule/publish memories and letters without redeploying.
- As the Author, I invite her device in person, revoke devices, and recover from loss.

## 8. Constraints and assumptions
Two users; ≤ 2,000 memories; AWS; neutral domain; English/Latin script; WCAG 2.2 AA; budget low tens of USD/month. Full list: Master spec §A. Locked decisions D-01…D-12 are in Master spec front matter.

## 9. Risks
Custom auth implementation (mitigate: libraries, tests, review, external pentest); low-end mobile performance (tiers, flat mode); content sensitivity (sealed fields, hold/archive); Author social engineering (runbooks). Full register: [11, 32].

## 10. Open questions for the Author
Domain name; allowed countries; primary region; whether to use a hardware key; the Recipient's onboarding conversation about what the Author can/cannot see; final closing line and greeting texts.
