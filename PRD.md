# PRD — Slow Light (Product Requirements Document)
Status: v1.0 · Owner: the Author · Source of truth for *what* and *why*. Detail lives in `docs/spec/` (numbers in brackets).

## 1. Product overview
Slow Light is a private, cinematic web sanctuary made for one person. Memories (dates, photos, videos, voice notes, letters, promises) appear as points of light in a night sky the Recipient explores by traveling through time. Two users only: the **Author** (curates) and the **Recipient** (visits). [01, 02]

Tagline: *"Everything we were is still arriving."*

## 2. Problem being solved
Relationship memories are scattered across chat apps and camera rolls, are easy to lose, and give no sense of a shared story. Generic galleries and wedding-site templates feel impersonal, and hosting intimate content casually is risky. Slow Light gives memories a *place* — and keeps them private, recoverable, and never observed.

## 3. Target audience
- **Recipient (primary):** one person, non-technical, mostly on a phone. Needs: one-touch entry, calm exploration, accessible reading, no tracking of her.
- **Author (secondary):** technically capable; needs: add memories/letters without redeploying, schedule and time-lock content, manage her devices, sleep well about security and backups.

Non-audience: the public, search engines, other couples.

## 4. Goals and success criteria
| Goal | Measure |
|---|---|
| Feels intimate and personal | Author + Recipient walkthrough review [34]; no banned patterns [05 §5.9] |
| Private by construction | Zero third-party requests; sealed text at rest; server-side authz; passes all 55 security test rows [27] |
| Performs everywhere | Budgets met on all six quality tiers including flat mode [28] |
| Recoverable | Restore drill meets RPO ≤ 5 min DB / ≤ 1 h media [30] |
| Accessible | WCAG 2.2 AA; full keyboard operation; DOM mirror is the complete equivalent of the sky [04 §4.8] |

## 5. MVP scope (must ship)
1. **The Veil → Threshold:** passkey-only login, arrival sequence (skippable, once per session; shorter on return). [03, 16]
2. **The World:** 3D sky with time-ordered lights (Doppler color ramp), chapters as constellations, Rail scrubber, six quality tiers + flat mode, DOM mirror for accessibility. [06]
3. **Memory panel ("Unfold"):** title, date, story (SL-text), place label, asset strip, prev/next. FLIP via WAAPI. [04 §4.6]
4. **Media viewer:** zoom, swipe, keyboard, captions, video/audio, graceful failure. URL auto-refresh before expiry. [07 §7.6]
5. **Letters (Lamp Room):** open, timed, held, and seal-ceremony modes — enforced server-side by DB clock (never client clock). [17, 03 Act V]
6. **Logbook:** search/filter/favorites; the complete accessible equivalent of the sky. [04]
7. **The Unlit:** future entries and the wordless ending ("This is as far as the light has come."). [03 Act VII]
8. **Private media pipeline:** upload → quarantine → validate/ClamAV/re-encode → signed same-origin access via `/_m/*`. [14]
9. **Admin console:** memories, chapters, letters, future entries, site texts, media, invites/devices/Knock, audit; behind the Admin Door. Author only, requires elevation. [04 §4.10, 10 §10.8]
10. **Security & recovery:** passkeys + Knock (risk-based step-up), RLS, sealed fields, audit hash chain, backups, offline archive. [10, 16, 30]
11. **Audio (opt-in):** ambient beds, SFX, crossfades; off by default; AudioContext only after a user gesture. [07 §7.5]

## 6. Out of scope (v1)
Public pages, sharing, comments/replies, analytics, password/magic-link auth, end-to-end encryption, maps, streaks, counters, read receipts, DRM. Phase 12 extensions (replies, E2EE "Sealed Vault v2", DBSC binding, HLS, map view) each require an ADR + human approval. [25]

## 7. Key user stories
- As the Recipient, I touch the screen once and the sky recognizes me.
- As the Recipient, I travel through time, open a light, and read its story and see photos/video with captions.
- As the Recipient, I open a letter only when it is meant to be opened; I can keep favorites; I can view and revoke my own devices.
- As the Recipient, I can trust that the Author cannot see what I open or when.
- As the Author, I add, schedule, and publish memories and letters without redeploying.
- As the Author, I invite her device in person, revoke devices, and recover from device loss.
- As the Author, I can time-lock a letter to a future date or hold it until I choose to release it.

## 8. Constraints and assumptions
Two users; ≤ 2,000 memories; AWS reference deployment; neutral domain with WHOIS privacy; English/Latin-script content; WCAG 2.2 AA; budget in the low tens of USD/month. Full assumptions list: Master spec §A (A-01…A-15). Locked decisions D-01…D-12 are in the Master spec front matter.

## 9. Risks
| Risk | Mitigation |
|---|---|
| Custom auth implementation bugs | `@simplewebauthn` library, 100% branch coverage, human review, external penetration test before Recipient enrollment [10.5] |
| Low-end mobile performance | Six quality tiers + flat mode; adaptive governor; real-device testing [25 Phase 4] |
| Painful memories surfacing unexpectedly | `archived` and `held` states; no surprise scheduling; Author controls timing |
| Author social engineering (Knock, Admin Door) | Runbooks; verify out-of-band; hardware key recommended |

Full threat register: [11, 32].

## 10. Open questions for the Author
- Domain name (needed before Phase 2 — WebAuthn is origin-bound)
- Allowed countries for WAF geo allow-list (needed before Phase 8)
- Primary AWS region (needed before Phase 3 Terraform)
- Whether to use a hardware security key as one of the Author's passkeys (strongly recommended)
- The Recipient's onboarding conversation about what the Author can and cannot see (privacy transparency)
- Final closing line ("This is as far as the light has come." is the spec default — confirm or replace)
- Greeting text shown at Threshold (comes from `site_texts.threshold.greeting`, never hard-coded)
