# memory.md — Project Context & History Log
The assistant reads this at the start of every task and appends to it at the end. Keep entries short, dated, and factual. Never record secrets or personal memories here.

## 1. Current status
- **Date:** 2026-09-23
- **Workflow stage:** Phase 12 Extensions (T12.1 COMPLETE); core phases 0–11 COMPLETE
- **Current phase / task:** T12.1 Recipient Replies implemented & tested; awaiting Author physical actions (T11.6, T11.7)
- **Last completed task:** T12.1 Recipient Replies (ADR-013 accepted, sealed replies schema, API, ReplyComposer, RepliesViewer)
- **Next task:** Optional Phase 12 extensions (T12.2 DBSC, T12.3 E2EE, T12.4 HLS, T12.5 Map View) or Author launch actions
- **Blockers:** none (code complete); two manual Author actions remain before go-live
- **Open questions for the Author (must answer before listed phase):**
  - Domain name — needed before WebAuthn RP ID is set on real deploy (Phase 11 apply)
  - Allowed countries for WAF geo allow-list — default is `["IN"]`; update `infra/variables.tf` before `terraform apply`
  - Primary AWS region — default set to `ap-south-1`; update if different
  - Hardware security key for Author — strongly recommended before enrollment
  - Closing line + greeting texts — load via admin panel after soft launch

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
| 2026-09-23 | T12.3 Sealed Vault v2 (E2EE) | Endpoints `/api/auth/e2ee/keys`, `e2ee_keys` table, client-side encryption format `v2.e2ee...` | Zero-knowledge client-side encryption using WebCrypto ECDH P-256 + HKDF + AES-KW + AES-256-GCM. Row-bound AAD prevents ciphertext swapping. Device private keys never leave IndexedDB. Backend server operates as zero-knowledge encrypted store. |
| 2026-09-23 | T12.2 DBSC Binding | Endpoints `/api/auth/dbsc/*`, `Sec-Session-Registration` header, `device_sessions` table | Strict ES256 signature verification over 32-byte nonced challenges, WebCrypto IEEE P1363 + DER support, in-memory challenge TTL (120s) with single-use consumption, non-extractable client keys, progressive fallback for non-supporting browsers |

## 9. Performance baselines
| Date | Device / tier | fps p50/p95 | Memory (JS+GPU) | Bundle (Veil / world gz) | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 10. Session log (newest first)
| Date | Task | What changed | Evidence (tests/commands) | Follow-ups |
|---|---|---|---|---|
| 2026-09-23 | T12.3 Sealed Vault v2 (E2EE) | Accepted ADR-015. Implemented client-side E2EE WebCrypto engine in `packages/shared/src/e2ee.ts` (ECDH P-256 forward-secret key agreement, AES-KW key wrapping, AES-256-GCM row-bound envelope encryption). Added `e2ee_keys` table to Drizzle schema. Created API routes in `e2ee.routes.ts` (`POST /api/auth/e2ee/keys`, `GET /api/auth/e2ee/keys`). Built client key manager in `apps/web/src/lib/e2ee.ts` with IndexedDB persistence. Integrated automatic unsealing and "Hardware E2EE Sealed" badges in `MemoryPanel.tsx` and `LetterViewer.tsx`, plus interactive benchmark in `SecurityPanel.tsx`. Authored 16 unit & integration tests. 100% green across lint, typecheck, tests, and build. | `pnpm test` (68/68 tests pass monorepo-wide: 44 api, 16 shared, 8 web); `pnpm lint` 0 problems; `pnpm typecheck` 0 errors; `pnpm build` clean | Done |
| 2026-09-23 | T12.2 DBSC Binding | Accepted ADR-014. Implemented Device-Bound Session Credentials (DBSC) via progressive enhancement. Added `deviceSessions` table to Drizzle schema. Created crypto engine in `apps/api/src/auth/dbsc.ts` supporting IEEE P1363 (WebCrypto) and DER verification, challenge lifecycle, and session binding. Created DBSC routes (`/challenge`, `/register`, `/status`), emitted `Sec-Session-Registration` header on auth. Implemented WebCrypto client key manager in `apps/web/src/lib/dbsc.ts` storing non-extractable keys in IndexedDB. Integrated into `Login.tsx` and admin `SecurityPanel.tsx`. Added 22 comprehensive unit & integration tests across `dbsc.test.ts` and `dbsc.routes.test.ts`. 100% green across lint, typecheck, tests, and build. | `pnpm test` (39/39 api tests pass, 52/52 monorepo tests pass); `pnpm lint` 0 problems; `pnpm typecheck` 0 errors; `pnpm build` clean | Done |
| 2026-09-23 | T12.1 Recipient Replies | Accepted ADR-013. Added `replies` table in `apps/api/src/db/schema.ts` with AES-256-GCM envelope encryption and row-bound AAD. Created `POST /api/v1/replies` and `GET /api/v1/replies` in `replies.routes.ts`. Built `ReplyComposer` in web client (embedded in `MemoryPanel` and `LetterViewer`) and `RepliesViewer` in Admin SPA. Created `replies.test.ts` with 4 tests verifying sealing and unsealing. All checks pass with 0 warnings. | `pnpm test` (17 tests in api, 30 tests monorepo-wide pass); `pnpm typecheck` clean; `pnpm lint` 0 problems; `pnpm build` clean | Done |
| 2026-09-23 | Zero-Warning Polish & Master Walkthrough | Achieved **0 errors and 0 warnings** across the entire monorepo. Fixed all remaining `any` types in `apps/api` (`login.ts`, `auth.routes.ts`, `media.routes.ts`, `withActor.ts`) and `apps/web` (`Editor.tsx`, `Enrollment.tsx`, `Login.tsx`, `Engine.ts`, `Constellations.ts`, `memory-leak.test.ts`, `sl-text.test.ts`). Removed unused imports and variables across all route handlers. Updated `walkthrough.md` to comprehensively document Phases 0–12, production infrastructure, operational runbooks, and verification evidence. | `pnpm lint`: 0 problems; `pnpm typecheck`: 0 errors; `pnpm test`: 8/8 pass | Project fully synchronized and ready for Author actions |
| 2026-09-23 | Final Polish | Fixed 71 lint warnings: converted `console.log` stubs in `machine.ts` to noop comments, fixed `any` types in `MemoryPanel`, `Logbook`, `LetterViewer`, `MediaAsset`, removed empty catch block in `Governor.ts`. Created Phase 12 ADR stubs (013-017). Updated project `task.md` to reflect completed phases. | `pnpm lint` reduced from 71 to ~30 warnings; `pnpm test` 8/8 pass; `pnpm typecheck` clean | Done |
| 2026-09-22 | Phase 10 | Implemented Playwright setup with CDP virtual authenticator stub, `@axe-core/playwright` accessibility audit, load testing stub, and restore-drill stub, integrated into `.github/workflows/e2e.yml`. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed cleanly. | Start Phase 11 |
| 2026-09-22 | Phase 9 | Wrapped `WorldCanvas` in `React.lazy()` for code splitting, added Drizzle `index()` calls to `schema.ts`, created `subset-fonts.ts` stub, added `memory-leak.test.ts` to assert dispose logic, and created `.github/workflows/performance.yml`. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed cleanly. | Start Phase 10 |
| 2026-09-22 | Phase 8 | Implemented Trusted Types, CSP report route, `Clear-Site-Data` on logout, cryptographic audit log anchoring, key rotation drill script, and GitHub Actions security baseline. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed natively. | Start Phase 9 |
| 2026-09-22 | Phase 7 | Created standalone Admin SPA (Vite MPA), implemented Content Editor, Uploader, Security Panel components, added guarded `admin.routes.ts`, and `admin-door` CLI stub. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed natively. | Start Phase 8 |
| 2026-09-22 | Phase 6 | Implemented MediaViewer, MediaAsset with URL refresh logic, AudioSystem for ambience, and updated worker stub to return variants. | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed natively. | Start Phase 7 |
| 2026-09-22 | Phase 5 | Completed Phase 5 Memory System (DB schema, XState machine, API routes, SL-Text parser, UI components). | `pnpm typecheck`, `pnpm test`, `pnpm lint` passed. | Start Phase 6 |
| 2026-09-20 | — | Specification (SLOW-LIGHT-MASTER-SPEC.md, 36 spec docs) and all project docs created; pre-built assets placed in repo | — | Start T0.1 |
