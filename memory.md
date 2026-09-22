# memory.md — Project Context & History Log
The assistant reads this at the start of every task and appends to it at the end. Keep entries short, dated, and factual. Never record secrets or personal memories here.

## 1. Current status
- **Date:** 2026-09-22
- **Workflow stage:** Phase 7 (Admin) Implementation Complete
- **Current phase / task:** Phase 7 complete
- **Last completed task:** T7.4 Admin Door CLI Script
- **Next task:** Phase 8 (Security Hardening)
- **Blockers:** none
- **Open questions for the Author (must answer before listed phase):**
  - Domain name — needed before Phase 2 (WebAuthn RP ID is origin-bound)
  - Allowed countries for WAF geo allow-list — needed before Phase 8
  - Primary AWS region — needed before Phase 3 Terraform
  - Hardware security key for Author — strongly recommended before Phase 2
  - Closing line + greeting texts — can be loaded via admin any time before launch

## 2. Important technical decisions (see ADRs in docs/adr/)
| ID | Date | Decision | Why | ADR |
|---|---|---|---|---|
| D-01 | spec v1.0 | Vite SPA + Fastify API (no Next.js/RSC) | Smaller server surface; Next.js CVE-2025-29927/CVE-2025-55182 | ADR-001 |
| D-02 | spec v1.0 | Vanilla Three.js engine (no R3F) | Explicit disposal, testable, no React coupling | ADR-002 |
| D-03 | spec v1.0 | Photos/videos in DOM, not WebGL textures | GPU memory, a11y, no taint issues | ADR-003 |
| D-04 | spec v1.0 | Passkey-only auth; Author-mediated recovery | No password DB, phishing-resistant | ADR-004 |
| D-05 | spec v1.0 | Server authz + Postgres RLS (FORCE) | Defense in depth — coding bug must not leak | ADR-005 |
| D-06 | spec v1.0 | Sealed text fields via AES-256-GCM + KMS envelope | Protects DB dumps and backups | ADR-006 |
| D-07 | spec v1.0 | Same-origin CloudFront signed media `/_m/*`, no caching | No foreign-origin bearer URLs | ADR-007 |
| D-08 | spec v1.0 | Originals never served by the app (CLI break-glass only) | Limit API-compromise blast radius | ADR-008 |
| D-09 | spec v1.0 | AWS reference deployment | One control plane, KMS/Object Lock/CloudTrail | ADR-009 |
| D-10 | spec v1.0 | Admin Door (WAF IP gate + separate hostname) | Admin hidden by default, unreachable from internet | ADR-010 |
| D-11 | spec v1.0 | No analytics, no third-party requests | Privacy | ADR-011 |
| D-12 | spec v1.0 | No E2EE in v1 | Complexity vs. threat level; upgrade path documented | ADR-012 |

## 3. Assumptions in force
See Master spec §A (A-01…A-15). Record any changed assumption here with date and reason.

Key assumptions affecting early phases:
- A-01: Exactly two users (Author + Recipient) — enforced by unique partial indexes in DB
- A-02: ≤ 2,000 memories — in-memory search index is acceptable
- A-04: AWS, one primary region + one backup region — Terraform targets a single region variable
- A-07: Author or agent can run CLI scripts — `pnpm cli` commands
- A-14: Human reviews every auth/authz/crypto/media/IAM change — non-negotiable

## 4. Environment and versions (verified at T0.1)
| Item | Value | Verified on |
|---|---|---|
| Node.js | v22.17.0 (Active LTS) | 2026-09-22 |
| pnpm | 12.5.1 (global user prefix) | 2026-09-22 |
| Git | 2.55.0.windows.5 | 2026-09-22 |
| Docker | 29.6.2 | 2026-09-22 |
| FFmpeg | 9.0-full_build (gyan.dev) | 2026-09-22 |
| TypeScript | ^5.7.0 (planned Phase 1) | — |
| Vite | ^7.0.0 (planned Phase 1) | — |
| React | ^19.0.0 (planned Phase 1) | — |
| Three.js | ^0.174.0 (planned Phase 1) | — |
| Fastify | ^5.2.0 (planned Phase 1) | — |
| XState | ^5.19.0 (planned Phase 1) | — |
| PostgreSQL | 16-alpine (Docker local) / RDS 16 | — |
| AWS region | us-east-1 (reference) | — |
| AWS backup region | us-west-2 (reference) | — |

## 5. Pre-built assets (validated, do NOT modify without human review)
| File | What it contains |
|---|---|
| `apps/api/src/crypto/sealed.ts` | `seal()` / `unseal()` — AES-256-GCM, row-bound AAD, format: `v1.<kid>.<nonce>.<ct+tag>` |
| `apps/web/src/app/experience.machine.json` | XState v5 machine JSON — 15 states, 9 guards, 9 actors |
| `packages/shared/src/layout.ts` | `layoutLights()`, `rampColor()`, `hash32()` (FNV-1a), `mulberry32()` PRNG |
| `packages/shared/schemas/content.schemas.json` | JSON Schema 2020-12 for all content types |
| `packages/shared/fixtures/examples.valid.json` | Synthetic test fixtures (placeholder strings only) |
| `packages/tokens/tokens.json` | All design tokens — two themes (night/lamp), spacing, motion, z-index |
| `packages/config/site.config.json` | Non-secret build-time config |
| `packages/config/performance-budgets.json` | Performance budget constraints |
| `infra/security-headers.json` | Strict CSP and all HTTP response headers |
| `security/threat-model.json` | Machine-readable threat model — 55-row security test matrix in docs/spec/27 |
| `db/migrations/0001_init.sql` | Full PostgreSQL schema — 27 tables, 3 roles, FORCE RLS on all |
| `db/schema.descriptor.json` | JSON mirror of schema for automated tests |

## 6. Major bugs and incidents
| Date | Task | Symptom | Root cause | Fix | Prevention (test added) |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 7. Architectural changes
| Date | Change | Consequences | Alternatives considered | Approved by | ADR |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 8. Security notes log
New inputs, boundaries, secrets, or log lines introduced per task, and how each is controlled (append per task, newest first).

| Date | Task | New surface | How controlled |
|---|---|---|---|
| — | — | — | — |

## 9. Performance baselines
| Date | Device / tier | fps p50/p95 | Memory (JS+GPU) | Bundle (Veil / world gz) | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Session log (newest first)
| Date | Task | What changed | Evidence (tests/commands) | Follow-ups |
|---|---|---|---|---|
| 2026-09-22 | Phase 7 | Created standalone Admin SPA (Vite MPA), implemented Content Editor, Uploader, Security Panel components, added guarded `admin.routes.ts`, and `admin-door` CLI stub. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed natively. | Start Phase 8 |
| 2026-09-22 | Phase 6 | Implemented MediaViewer, MediaAsset with URL refresh logic, AudioSystem for ambience, and updated worker stub to return variants. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed natively. | Start Phase 7 |
| 2026-09-22 | Phase 5 | Completed Phase 5 Memory System (DB schema, XState machine, API routes, SL-Text parser, UI components). | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed. | Start Phase 6 |
| 2026-09-20 | — | Specification (SLOW-LIGHT-MASTER-SPEC.md, 36 spec docs) and all project docs created; pre-built assets placed in repo | — | Start T0.1 |
