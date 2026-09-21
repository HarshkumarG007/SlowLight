# 02 — CREATIVE CONCEPT

## 2.1 The concept
- **Name:** Slow Light
- **Tagline:** *Everything we were is still arriving.*
- **One sentence:** A private night sky in which every shared moment is a point of light that left long ago and has only now reached her — warm where it is old, cool where it is still ahead — and the darkest part of the sky is what we have not lived yet.
- **Emotional objective:** She should feel *witnessed across time*: the past is not lost but in transit, the present is where the light lands, the future is real but unlit.

## 2.2 Concept directions evaluated

| Criterion | A. Night Garden | B. House of Rooms | C. The Long Shore | D. Constellation map (naive) | **E. Slow Light** |
|---|---|---|---|---|---|
| Emotional fit | Growth, seasons; leans sweet | Strongest tangibility (objects, rooms) | Time smooths things (sea glass); poignant | Romantic but generic | Time made spatial; restraint by construction |
| Originality | Common | Moderate | High | Very common | High: a physics-derived grammar |
| Mobile/GPU cost | Heavy (foliage, instancing) | Heavy (authored 3D interiors) | Heavy (water shader) | Very light | Very light (instanced quads, additive) |
| Growth as memories are added | Good | Poor (every memory needs a place) | Good | Good | Excellent: new lights arrive at the Frontier |
| DOM/a11y equivalent | Moderate | Moderate | Weak | Strong | Strong (Logbook mirrors the sky exactly) |
| Authoring cost (solo + agent) | High | Very high | High | Low | Low |
| Cliché risk | Medium | Low | Low | High | Low if rules in §2.3 are enforced |

**Trade-offs, honestly.** B offers the most tactile intimacy but is unaffordable in assets and layout logic and does not scale with new memories. C has the best metaphor for time and loss but pays for it in shader cost, and has no natural "enclosure" for a private sanctuary. A is pleasant but drifts toward sentimentality. D is technically ideal and emotionally hollow: dots on black with no meaning. **E keeps D's technical frugality and gives it meaning** by borrowing real optics, and steals one idea from B (a single warm room for letters) and one from A (a world that keeps growing).

## 2.3 The physics of Slow Light (design grammar — every visual rule must trace to one of these)

| # | Rule | Visual consequence |
|---|---|---|
| R1 | Distance is time | Timeline is the depth axis (the Rail) |
| R2 | Doppler: receding light reddens, approaching light blues | Past = amber, present = candle white, future = pale steel blue |
| R3 | Brightness is significance, not recency | Author sets `significance` 1–5; nothing dims because it is old |
| R4 | Constellations are chosen, not found | Lines exist only where the Author drew a Chapter |
| R5 | Dark adaptation | After ~6 s of stillness exposure rises and faint lights appear; movement resets gently |
| R6 | Parallax is honest | Near lights move more than far ones |
| R7 | Only one place is warm | The Lamp Room (letters) is the sole interior and the sole amber-lit space |
| R8 | The frontier moves | New memories appear at the Frontier; a future entry can "arrive" |

## 2.4 What it feels like
- **Entry (Veil → Threshold):** hush; near-black; one faint light breathing. "Let your eyes adjust." Touch to enter; the world recognizes her.
- **Exploration:** slow flight through amber and white lights; nothing shouts; stillness reveals more.
- **Ending (the Unlit):** the rail runs out. Hollow rings ahead. *"This is as far as the light has come."* Then silence. She returns later and the frontier has moved.

## 2.5 What makes it unique
A rule-based visual language (R1–R8) instead of decoration; a Logbook that is a complete equivalent of the sky; a sky that changes between visits; time-locked letters enforced by the server; no metrics or read-receipts on her.

## 2.6 Voice
Two registers, never mixed. **World voice** (narrative moments): sparse, physical, declarative, sentence case, no exclamation marks. **Interface voice** (controls, errors): plain verbs, specific, no apology, no cutesy. Example errors: "The connection dropped. Your place is saved; we will reconnect." Never "Oops".

Placeholder microcopy (stored as sealed site texts, editable by the Author, never in code — RULE-010):
- `veil.hint` "Let your eyes adjust."
- `threshold.greeting` "[GREETING — you write this]"
- `unlit.closing` "This is as far as the light has come."
- `rest.confirm` "Leave the sky for now."

## 2.7 Anti-goals
Hearts, rose petals, glassmorphism everywhere, gradient washes, confetti, "love counter" widgets, autoplaying music, generic card grids, a starfield with no rules.
