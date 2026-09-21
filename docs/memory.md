# memory.md — Project Context & History Log
The assistant reads this at the start of every task and appends to it at the end. Keep entries short, dated, and factual. Never record secrets or personal memories here.

## 1. Current status
- **Date:** [YYYY-MM-DD]
- **Workflow stage:** Setup not started (Idea → Task breakdown complete)
- **Current phase / task:** Phase 0 / T0.1
- **Last completed task:** none
- **Next task:** T0.1
- **Blockers:** none
- **Open questions for the Author:** domain name; allowed countries; primary AWS region; hardware key; closing line and greeting texts

## 2. Important technical decisions (see ADRs)
| ID | Date | Decision | Why | ADR |
|---|---|---|---|---|
| D-01 | spec v1.0 | Vite SPA + Fastify API (no Next.js/RSC) | Smaller server surface | ADR-001 |
| D-02 | spec v1.0 | Vanilla Three.js engine (no R3F) | Explicit disposal, testable | ADR-002 |
| D-03 | spec v1.0 | Photos/videos in DOM, not textures | GPU memory, a11y | ADR-003 |
| D-04 | spec v1.0 | Passkey-only auth; Author-mediated recovery | No password DB, phishing-resistant | ADR-004 |
| D-05 | spec v1.0 | Server authz + Postgres RLS | Defense in depth | ADR-005 |
| D-06 | spec v1.0 | Sealed text fields via KMS envelope | Protect dumps/backups | ADR-006 |
| D-07 | spec v1.0 | Same-origin CloudFront signed media, no caching | No foreign-origin bearer URLs | ADR-007 |
| D-08 | spec v1.0 | Originals never served by the app | Limit API-compromise blast radius | ADR-008 |
| D-09 | spec v1.0 | AWS reference deployment | One control plane, KMS/Object Lock | ADR-009 |
| D-10 | spec v1.0 | Admin Door (WAF IP gate) | Admin hidden by default | ADR-010 |
| D-11 | spec v1.0 | No analytics/third-party requests | Privacy | ADR-011 |
| D-12 | spec v1.0 | No E2EE in v1 | Complexity vs threat level | ADR-012 |

## 3. Assumptions in force
See Master spec §A (A-01…A-15). Record any change here with date and reason.

## 4. Environment and versions
| Item | Value | Verified on |
|---|---|---|
| Node / pnpm | [fill at T0.1] | |
| Three.js / React / Vite / Fastify | [pin exact] | |
| PostgreSQL | [major] | |
| AWS region / backup region | [fill] | |

## 5. Major bugs and incidents
| Date | Task | Symptom | Root cause | Fix | Prevention (test added) |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 6. Architectural changes
| Date | Change | Consequences | Alternatives considered | Approved by | ADR |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 7. Security notes log
New inputs/boundaries/secrets/log lines introduced, and how each is controlled (append per task).

## 8. Performance baselines
| Date | Device/tier | fps p50/p95 | Memory | Bundle (Veil / world) | Notes |
|---|---|---|---|---|---|

## 9. Session log (newest first)
| Date | Task | What changed | Evidence (tests/commands) | Follow-ups |
|---|---|---|---|---|
| [YYYY-MM-DD] | — | Specification and project docs created | — | Start T0.1 |
