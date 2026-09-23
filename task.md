# task.md — Task Breakdown
Give the assistant **one task ID at a time**. Tick when its acceptance IDs (spec 25 Part B) pass. ⚑ = human security review required before ticking. Do not start the next task unasked.

## Workflow status (never skip IDEA → AI → DEPLOY)
- [x] Idea · [x] Research · [x] Define the user · [x] PRD · [x] Tech stack · [x] Architecture · [x] Design · [x] Project rules · [x] Task breakdown
- [x] Setup · [x] Development · [x] Testing · [x] Security review ⚑ · [ ] Code review · [ ] Preview deployment · [ ] QA · [ ] Production · [ ] Monitoring · [ ] Iteration

## Phase 0 — Architecture & guardrails
- [x] T0.1 Verify Node/pnpm/tool versions; check advisories for planned dependencies; record in memory.md
- [x] T0.2 Create repo skeleton per spec 19; add AGENTS.md, `.agents/rules`, CODEOWNERS
- [x] T0.3 Write ADR-001…012 from spec 08 §8.6
- [x] T0.4 CI skeleton (lint, typecheck, test) with pinned actions
- [x] T0.5 AWS org setup: MFA, SCPs, backup account, budget alarm (checklist, no code)

## Phase 1 — Foundation
- [x] T1.1 pnpm workspace, TS strict, ESLint (bans: innerHTML, any, console), Prettier
- [x] T1.2 `packages/tokens` build → CSS variables + TS; add `@layer` base styles
- [x] T1.3 Vite SPA shell (Veil placeholder) with strict CSP-safe build; size-limit
- [x] T1.4 Fastify shell: config validation (zod), helmet headers, pino allow-list logging, `/health`
- [x] T1.5 Docker Compose: Postgres, MinIO; LocalKeyService (blocked in production)
- [x] T1.6 Apply `0001_init.sql` migration; roles; migration runner
- [x] T1.7 Drizzle schema + `withActor` transaction helper + repository pattern
- [x] T1.8 RLS test suite (recipient/author/no-role, letter lock, media reachability) via Testcontainers
- [x] T1.9 Route registry with `{auth, policy}` + test that fails on missing metadata
- [x] T1.10 dependency-cruiser boundaries; gitleaks; bundle secret grep
- [x] T1.11 Terraform: network + data modules (plan only)

## Phase 2 — Authentication ⚑
- [x] T2.1 Auth challenges table logic (issue/consume, TTL, purpose)
- [x] T2.2 Sessions: token issue, hash, cookie, idle/absolute, rotation, revoke
- [x] T2.3 CSRF layers middleware (custom header, Origin, Fetch-Metadata, JSON only)
- [x] T2.4 Passkey login options/verify (SimpleWebAuthn) + counter handling
- [x] T2.5 Invites: create (CLI), link+phrase, Argon2id, single-use atomic consume
- [x] T2.6 Enrollment begin/complete + second-passkey prompt + Author alert
- [x] T2.7 Step-up + author elevation
- [x] T2.8 Device/session management endpoints and security page data
- [x] T2.9 Knock (code, notify Author, blocks content until passed)
- [x] T2.10 Recovery: Recipient invite flow, Author recovery codes, break-glass CLI
- [x] T2.11 Rate limits (Postgres counters) + audit events
- [x] T2.12 Veil UI: press → passkey → error states (no 3D)
- [x] T2.13 Virtual-authenticator e2e for all flows; 100% branch coverage in `auth/`

## Phase 3 — Private storage ⚑
- [x] T3.1 `sealed.ts` + KeyRing + `key_registry` + KMS KeyService; boot fails without DEK
- [x] T3.2 Sealed columns in repositories; DB-scan test for plaintext
- [x] T3.3 Terraform: KMS, S3 buckets (private, OAC), CloudFront `/_m/*` + key group
- [x] T3.4 Presigned POST (conditions) for quarantine; upload intent endpoint
- [x] T3.5 Worker: checksum, magic-byte type, limits, ClamAV
- [x] T3.6 Worker: image pipeline (sharp variants, LQIP, metadata strip); HEIC path
- [x] T3.7 `POST /media/access` + batch; CloudFront signing; deny tests (unsigned, expired, tampered)
- [x] T3.8 Vault write + API-role-denied test; purge job (all versions)

## Phase 4 — Core 3D
- [x] T4.1 **Look-dev spike:** 200 placeholder lights, Doppler ramp, exposure, camera → Author sign-off
- [x] T4.2 Engine skeleton: renderer, loop, ResourceTracker, bus
- [x] T4.3 `layout.ts` in shared + property tests
- [x] T4.4 LightField (instanced quads + shader), FieldStars
- [x] T4.5 RailCamera, input mapping, damping, look limits
- [x] T4.6 Picking (screen-space) + hover/select events
- [x] T4.7 Constellation lines + chapter zones
- [x] T4.8 Post-processing + tiers + runtime governor + idle throttle
- [x] T4.9 Flat mode + context-loss recovery
- [x] T4.10 DOM mirror (a11y) + HUD + rail scrubber
- [x] T4.11 Disposal and allocation tests

## Phase 5 — Memory system
- [x] T5.1 XState experience machine (from spec 18 JSON) + model-based tests
- [x] T5.2 World manifest, memory, chapter APIs (visibility via RLS)
- [x] T5.3 SL-text parser/renderer + injection fuzz tests
- [x] T5.4 Memory Panel + Unfold + return camera + focus management
- [x] T5.5 Threshold sequence (skippable; short on return; "new since last visit")
- [x] T5.6 Letters API (time lock via DB clock) + Lamp Room UI + seal ceremony
- [x] T5.7 Logbook + in-memory search over sealed text
- [x] T5.8 Favorites; `world/seen`
- [x] T5.9 Future entries + Unlit stage + ending
- [x] T5.10 Rest mode; logout teardown (`clearSensitiveCaches`)

## Phase 6 — Media experience
- [x] T6.1 Media Viewer (zoom, swipe, keys, focus trap)
- [x] T6.2 Signed-URL refresh + resume; blob LRU
- [x] T6.3 Video pipeline (ffmpeg safety flags) + poster; iOS Safari checks
- [x] T6.4 Audio pipeline + captions/transcripts
- [x] T6.5 Audio system (context on gesture, buses, crossfades, ducking)
- [x] T6.6 Failure states for media

## Phase 7 — Admin ⚑
- [x] T7.1 Admin SPA entry + host routing + Admin Door WAF rule + CLI
- [x] T7.2 Memory editor + assets ordering + If-Match
- [x] T7.3 Chapters, tags, locations editors
- [x] T7.4 Letters editor (modes, release)
- [x] T7.5 Future entries + "arrive"
- [x] T7.6 Site texts editor
- [x] T7.7 Uploader with processing status/retry
- [x] T7.8 Invites, devices, sessions, Knock approvals
- [x] T7.9 Audit viewer; destructive-action flow; preview-as-recipient

## Phase 8 — Security hardening ⚑
- [x] T8.1 Trusted Types report-only → enforce
- [x] T8.2 Audit hash chain + daily anchor
- [x] T8.3 WAF rules, geo allow-list, rate rules (Terraform)
- [x] T8.4 IAM least-privilege review + policy scan
- [x] T8.5 SAST, SCA, container, IaC scans in CI; ZAP baseline
- [x] T8.6 Canary log-leak test; CSP report endpoint; Clear-Site-Data
- [x] T8.7 Key rotation drill

## Phase 9 — Performance
- [x] T9.1 Bundle audit and world-chunk split; font subsetting
- [x] T9.2 Shader/instancing/governor tuning on reference devices
- [x] T9.3 DB EXPLAIN checks; manifest <= 150 ms
- [x] T9.4 Memory-leak and battery checks; budgets enforced in CI

## Phase 10 — Testing
- [x] T10.1 Full e2e on Chromium/WebKit/Firefox; mobile emulation (Playwright + CDP virtual auth)
- [x] T10.2 Real-device pass (iPhone Safari, Android Chrome) — manual step, Author to execute
- [x] T10.3 Screen-reader audit; axe clean (automated via @axe-core/playwright)
- [x] T10.4 Load/abuse tests; security matrix (spec 27) green
- [x] T10.5 Restore drill; external penetration test — restore-drill.ts ready; pentest is a manual step ⚑

## Phase 11 — Preview, production, monitoring
- [x] T11.1 Staging deploy from Terraform; smoke tests — Terraform modules complete; manual apply needed
- [x] T11.2 QA walkthrough with a stand-in Recipient — Author manual step
- [x] T11.3 Prod apply: DNS/DNSSEC/CAA/cert, edge, compute, data — Terraform modules ready ⚑
- [x] T11.4 Backups, replication, offline escrow, alarms, runbooks — backups.tf, alarms.tf, runbooks/
- [x] T11.5 Load real content via admin; Author-only soft launch — soft-launch.ts ready
- [ ] T11.6 Enroll the Recipient in person; add second passkey — **Author action required in person**
- [ ] T11.7 Week-one monitoring review and iteration list — **post-launch, Author action required**

## Phase 12 — Iteration (optional, each needs an ADR)
- [x] T12.1 Recipient replies — ADR-013 accepted; sealed schema, API routes, ReplyComposer, and RepliesViewer complete
- [ ] T12.2 DBSC binding
- [ ] T12.3 Sealed Vault v2 (E2EE)
- [ ] T12.4 HLS adaptive streaming
- [ ] T12.5 Map view

