# PROJECT-STATE.md — Slow Light Project State & Phase Tracking

## 1. Project Overview & Architecture Summary
- **Type**: Private, security-critical romantic web sanctuary for exactly two humans (Author & Recipient).
- **Frontend**: Vite + React 19 SPA (static on S3/CloudFront), Vanilla Three.js engine (typed command/event bus, DOM media), CSS Modules with `@layer`.
- **Backend**: Fastify on ECS Fargate, schema-first (zod `.strict()`), allow-list pino logging, least-privilege IAM auth.
- **Database**: RDS PostgreSQL with Row-Level Security (RLS `FORCE`), pg-boss job queue.
- **Media & Storage**: Private S3 buckets with SSE-KMS, same-origin CloudFront signed URLs (`/_m/*`), media-worker on Fargate (sharp, ffmpeg, ClamAV), originals in restricted Vault (API denied decrypt).
- **Security & Privacy**: Passkey-only WebAuthn, AES-256-GCM sealed envelope encryption for personal text, strict CSP (`'none'` default, self-hosted fonts/assets, zero analytics/third-parties), Admin Door WAF IP set.

### Doc 00 §A Assumptions Register (Active & Invariant)
- **A-01**: Exactly two humans: Author (admin) and Recipient (viewer).
- **A-02**: Scale ≤ 2,000 memories, ≤ 200 letters, ≤ 20,000 assets, ≤ 200 GB.
- **A-03**: Content language is Latin-script English.
- **A-04**: AWS, one primary region + one backup region, separate backup account.
- **A-05**: Neutral domain with WHOIS privacy.
- **A-06**: Recipient device supports WebAuthn passkeys (User Verification required).
- **A-07**: Author runs CLI scripts (invites, Admin Door, restore drills).
- **A-08**: Zero analytics, ads, social sharing, or recipient activity tracking.
- **A-09**: Cost profile: low tens USD/month.
- **A-10**: Non-commercial personal sanctuary.
- **A-11**: Recipient cannot post content in v1 (view & favorite only).
- **A-12**: Modern evergreen browsers (last 2 Chrome/Edge/Firefox/Safari; iOS 17+); lower tiers use flat mode.
- **A-13**: WCAG 2.2 AA accessibility floor.
- **A-14**: Human review required for all auth, crypto, authz, media pipeline, and IAM changes.
- **A-15**: Sound is off by default (user gesture required).

---

## 2. Phase Tracking

| Phase | Title | Status | Acceptance IDs | Target Date / S |
|---|---|---|---|---|
| **0** | **Architecture & Guardrails** | **COMPLETE** | DEP-01, SEC-15 | 2 S |
| **1** | **Foundation** | **COMPLETE** | SEC-01..04, DEP-02 | 4 S |
| **2** | **Authentication ⚑** | **COMPLETE** | AUTH-01..12 | 6 S |
| **3** | **Private Storage ⚑** | **COMPLETE** | MED-01..10, SEC-05..09 | 4 S |
| 4 | Core 3D | READY TO EXECUTE | 3D-01..12, MOB-01..05 | 8 S |
| 5 | Memory System | QUEUED | UX-01..10, AUTHZ-01..08 | 5 S |
| 6 | Media Experience | QUEUED | MED-11..16, A11Y-05..08 | 4 S |
| 7 | Admin ⚑ | QUEUED | ADM-01..10 | 6 S |
| 8 | Security Hardening ⚑ | QUEUED | SEC-*, PRIV-* | 5 S |
| 9 | Performance | QUEUED | PERF-01..10 | 4 S |
| 10 | Testing & Verification | QUEUED | All | 5 S |
| 11 | Production Deployment | QUEUED | DEP-*, REL-* | 4 S |

---

## 3. Phase 0: Architecture & Guardrails (Completed)

### Goal
Establish verified tooling baselines, initialize repository version control and structure per Spec 19, record locked Architectural Decision Records (ADR-001 through ADR-012), establish CI guardrail skeletons with commit-pinned actions, enforce CODEOWNERS for security-critical paths, and document AWS Organization guardrails.

### Tasks
- [x] **T0.1 Tooling Verification & Advisory Policy**: Verify Node, pnpm, git, ffmpeg, Docker. Document versions and advisory policy in `memory.md`.
- [x] **T0.2 Repository Skeleton & Governance**: Initialize git repo, create `.gitignore`, `.github/CODEOWNERS`, `.agents/rules/` (mirroring AGENTS.md), `.agents/workflows/phase.md`.
- [x] **T0.3 Architectural Decision Records (ADR-001…012)**: Author formal ADRs in `docs/adr/` covering all locked decisions (D-01…D-12).
- [x] **T0.4 CI Guardrail Skeleton**: GitHub Actions workflow (`.github/workflows/ci.yml`, `security.yml`) with pinned SHAs.
- [x] **T0.5 AWS Organization Guardrails Checklist**: Document AWS MFA, SCP, Object Lock, backup account, and budget alarm policies in `infra/AWS-ORGANIZATION-GUARDRAILS.md`.

### Files to Add / Change
- `docs/PROJECT-STATE.md` (this file)
- `memory.md` (update status, tooling, notes)
- `.gitignore`
- `.github/CODEOWNERS`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.agents/rules/AGENTS.md`
- `.agents/workflows/phase.md`
- `docs/adr/001-spa-over-nextjs.md`
- `docs/adr/002-vanilla-three.md`
- `docs/adr/003-photos-in-dom.md`
- `docs/adr/004-passkey-only-auth.md`
- `docs/adr/005-postgres-rls.md`
- `docs/adr/006-sealed-text-kms-envelope.md`
- `docs/adr/007-same-origin-signed-media.md`
- `docs/adr/008-originals-cli-only.md`
- `docs/adr/009-aws-reference-deployment.md`
- `docs/adr/010-admin-door.md`
- `docs/adr/011-zero-analytics-and-third-party.md`
- `docs/adr/012-no-e2ee-v1.md`
- `infra/AWS-ORGANIZATION-GUARDRAILS.md`
- `task.md` (update Phase 0 task checkboxes)

### Risks & Mitigations
- **Risk**: Tooling version drift between local dev and CI.
  - *Mitigation*: Exact version pinning in `package.json` (`packageManager`), Docker base image digests, and CI runner configurations.
- **Risk**: Missing security review on sensitive paths.
  - *Mitigation*: Strict `.github/CODEOWNERS` requiring human Author sign-off on auth, authz, crypto, media, infra, db, and ADRs.

### Acceptance Criteria IDs
- **DEP-01**: Tooling verified, architecture locked, ADRs committed, CI pipelines established.
- **SEC-15**: Org guardrails (MFA, SCP, budget alarm, backup isolation) documented and ready for activation.

---

## 4. Phase 1: Foundation (Detailed Plan for Next Step)

### Goal
Implement a fully runnable monorepo skeleton (`pnpm dev` boots), strict TypeScript/ESLint/Prettier configurations, token compilation system producing CSS vars, Fastify API shell with security headers and config validation, Vite SPA shell respecting strict CSP, PostgreSQL schema migration runner with RLS enforcement (`0001_init.sql`), and Testcontainers RLS test suite.

### Phase 1 Task Breakdown
1. **T1.1 Monorepo & Tooling Setup**:
   - Root `package.json`, `pnpm-workspace.yaml`, `.npmrc` (disabling install scripts by default except sharp/isolated allow-list).
   - TypeScript base config (`tsconfig.base.json`) with strict mode, `noUncheckedIndexedAccess`.
   - ESLint config (`eslint.config.js`) enforcing no `any`, no `innerHTML`, no `console.log`.
   - Prettier config.
2. **T1.2 Design Tokens Package (`packages/tokens`)**:
   - Build script transforming `tokens.json` to `tokens.css` (custom properties) and `tokens.ts`.
   - Core `@layer reset, tokens, base, components, utilities` CSS structure.
3. **T1.3 Vite SPA Shell (`apps/web`)**:
   - Vite 7 + React 19 SPA with strict CSP compliance (no inline scripts, CSSOM only).
   - Veil screen placeholder with theme tokens.
   - Bundle size limit checks.
4. **T1.4 Fastify Shell (`apps/api`)**:
   - Fastify 5 bootstrap, `@fastify/helmet` with `infra/security-headers.json`, `@fastify/cookie`.
   - Zod runtime configuration schema (`src/config/env.ts`) validating boot environment variables.
   - Allow-list pino logging (`src/observability/logger.ts`) redacting sensitive fields.
   - `/health` endpoint returning non-sensitive status.
5. **T1.5 Local Development Docker & Services**:
   - `docker-compose.yml` defining PostgreSQL 16, MinIO (local S3), and local KMS/KeyService mock.
   - `LocalKeyService` guard throwing an error if loaded in production environments.
6. **T1.6 Database Schema & Migration Runner**:
   - Migration runner applying `db/migrations/0001_init.sql`.
   - Verify roles (`sl_app`, `sl_worker`) and table definitions.
7. **T1.7 Drizzle ORM & Actor Transactions**:
   - Drizzle schema mapped to `0001_init.sql`.
   - Transaction helper `withActor(tx, actor, fn)` setting `app.role` and `app.user_id`.
   - Repository scaffolding for identity and content.
8. **T1.8 RLS Test Suite**:
   - Vitest suite executing against PostgreSQL (via Testcontainers or local Docker).
   - Test matrix: Author vs Recipient vs Anonymous permissions on memories, drafts, locked letters, and media.
9. **T1.9 Route Registry & Policy Enforcement**:
   - Typed route definitions requiring `{ auth: AuthLevel, policy: PolicyRule }`.
   - Static test asserting that 100% of defined routes declare security policy.
10. **T1.10 Supply Chain & Boundaries**:
    - `.dependency-cruiser.cjs` enforcing architectural layer boundaries (shared -> web/api; web never imports api).
    - Bundle secret grep test ensuring no server secrets leak into web build.
11. **T1.11 Terraform Infrastructure Skeletons**:
    - Terraform network and data modules (VPC, private subnets, RDS, S3).
