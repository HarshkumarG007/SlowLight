# 01 — PRODUCT VISION

## 1.1 Purpose
Slow Light is a private world made for one person. It holds relationship memories — dates, letters, photographs, videos, voice recordings, milestones, promises — and lets her explore them as a place rather than a feed. Two people use it: the **Author** who curates, and the **Recipient** who visits.

## 1.2 The dual quality bar

| Emotional quality | Engineering quality | Measurable proxy |
|---|---|---|
| Intimate, personal | Private | Zero third-party requests; no analytics; sealed text at rest |
| Cinematic, peaceful | Performant | Veil interactive < 2 s on mid-tier Android over Fast 4G; world ≥ 45 fps on Medium tier |
| Alive, dreamlike | Resilient | Graceful degradation across 6 quality tiers incl. no-WebGL |
| Timeless, sophisticated | Maintainable, auditable | One auth module, one policy module, one crypto module; audit trail |
| Remembered | Recoverable | RPO ≤ 5 min (DB), ≤ 1 h (media); quarterly restore drills |

## 1.3 Primary user stories
- **Recipient:** enter with one touch; explore lights in time order; open a memory and its media; read a letter; search the Logbook; "keep" a memory; see her own sign-in history and devices; leave calmly ("Rest").
- **Author:** draft, schedule and publish memories; upload media; seal or time-lock letters; draw chapters; add unlit future entries; invite and revoke devices; open the Admin Door; restore from backup.

## 1.4 Non-goals
No public pages, sharing, comments, SEO, monetization, social features, gamification, streaks, read receipts, or "you haven't visited" nudges. No multi-couple SaaS. No DRM or screenshot blocking (impossible; see Doc 10 §10.10).

## 1.5 Design principles (binding)
1. Emotion before information. 2. Mystery before explanation. 3. Interaction has meaning — no decoration for its own sake. 4. Restraint: no hearts, neon, glassmorphism, particle storms. 5. Cinematic pacing: silence, empty space, memories that breathe. 6. She should feel remembered: handcrafted, never templated. 7. Respect: nothing she does inside is observed by the Author.
