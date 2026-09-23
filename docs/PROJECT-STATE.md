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
- **A-11**: Recipient cannot post content in v1 (view & favorite only; replies via T12.1 whisper composer).
- **A-12**: Modern evergreen browsers (last 2 Chrome/Edge/Firefox/Safari; iOS 17+); lower tiers use flat mode.
- **A-13**: WCAG 2.2 AA accessibility floor.
- **A-14**: Human review required for all auth, crypto, authz, media pipeline, and IAM changes.
- **A-15**: Sound is off by default (user gesture required).

---

## 2. Phase Tracking

| Phase | Title | Status | Acceptance IDs | Notes |
|---|---|---|---|---|
| **0** | **Architecture & Guardrails** | **COMPLETE** | DEP-01, SEC-15 | ADR-001..012, CI workflows, pinned SHAs, CODEOWNERS |
| **1** | **Foundation** | **COMPLETE** | SEC-01..04, DEP-02 | Monorepo, tokens, Fastify shell, Drizzle schema, RLS, Docker Compose |
| **2** | **Authentication ⚑** | **COMPLETE** | AUTH-01..12 | Passkeys, sessions, CSRF, invites, step-up, knock, recovery, rate limits |
| **3** | **Private Storage ⚑** | **COMPLETE** | MED-01..10, SEC-05..09 | AES-256-GCM envelope encryption, presigned upload, worker pipeline, signed URLs |
| **4** | **Core 3D** | **COMPLETE** | 3D-01..12, MOB-01..05 | Three.js engine, LightField, FieldStars, Constellations, camera rail, Governor |
| **5** | **Memory System** | **COMPLETE** | UX-01..10, AUTHZ-01..08 | XState machine, SL-Text parser, MemoryPanel, LampRoom, LetterViewer, synthetic seeder |
| **6** | **Media Experience** | **COMPLETE** | MED-11..16, A11Y-05..08 | MediaViewer, 403 URL auto-refresh, Web Audio ambient soundscapes |
| **7** | **Admin Console ⚑** | **COMPLETE** | ADM-01..10 | Standalone Vite MPA (`admin.html`), editors, uploader, Admin Door CLI |
| **8** | **Security Hardening ⚑** | **COMPLETE** | SEC-*, PRIV-* | Trusted Types, Clear-Site-Data, HMAC audit log chain, key rotation drill |
| **9** | **Performance** | **COMPLETE** | PERF-01..10 | Code splitting, bundle budgets (< 120 KB gzip Veil), memory leak tests |
| **10** | **Testing & Resilience** | **COMPLETE** | All | Playwright CDP virtual passkeys, axe a11y, load tests, restore drill |
| **11** | **Production Infrastructure** | **CODE-COMPLETE** | DEP-*, REL-* | Terraform (WAF, backups, alarms), soft-launch CLI, runbooks (T11.6/T11.7 manual) |
| **12** | **Iteration Extensions** | **IN PROGRESS** | EXT-* | T12.1 (Replies), T12.2 (DBSC), T12.3 (E2EE), T12.4 (HLS) COMPLETE; T12.5 ADR authored |

---

## 3. Monorepo Quality & Verification Status

All automated quality gates pass cleanly with **zero warnings and zero errors**:

| Metric | Target | Actual | Status |
|---|---|---|---|
| **ESLint Warnings** | 0 warnings | 0 warnings | ✅ PASS |
| **ESLint Errors** | 0 errors | 0 errors | ✅ PASS |
| **TypeScript Errors** | 0 errors (`strict`, `noUncheckedIndexedAccess`) | 0 errors | ✅ PASS |
| **Vitest Tests** | 100% pass | 77 / 77 pass across 11 test suites | ✅ PASS |
| **Production Build** | Clean build for all workspaces | Clean builds for web, api, worker, tokens | ✅ PASS |
| **Git Working Tree** | Clean, synchronized with origin/main | Up to date with `origin/main` | ✅ PASS |

---

## 4. Phase 12 Extensions State

1. **T12.1 Recipient Replies (COMPLETE)**:
   - **ADR-013 Accepted**: Adopted Option 1 (Full sealed text reply interface).
   - **Schema**: `replies` table with row-bound AES-256-GCM encryption (`body_sealed`).
   - **Endpoints**: `POST /api/v1/replies` and `GET /api/v1/replies` in `replies.routes.ts`.
   - **Client**: `ReplyComposer.tsx` embedded in `MemoryPanel` and `LetterViewer`.
   - **Admin**: `RepliesViewer.tsx` dedicated tab in Admin console.
   - **Tests**: 4 unit/integration tests in `replies.test.ts`.

2. **T12.2 DBSC Binding (COMPLETE)**:
   - **ADR-014 Accepted**: Adopted Option 2 (Progressive enhancement with ECDSA P-256 WebCrypto keys).
   - **Schema**: `deviceSessions` table with JWK device public key and `sessionId` relation.
   - **Crypto**: `dbsc.ts` engine supporting IEEE P1363 (WebCrypto) and DER verification, 120s single-use challenge anti-replay.
   - **Endpoints**: `POST /api/auth/dbsc/challenge`, `POST /api/auth/dbsc/register`, `GET /api/auth/dbsc/status`.
   - **Header**: Emits `Sec-Session-Registration: (path="/api/auth/dbsc/register")` on login/enrollment.
   - **Client**: `dbsc.ts` IndexedDB key vault (`sl_dbsc_vault`) and automatic progressive registration.
   - **UI**: Silent registration in `Login.tsx` and status badge in `SecurityPanel.tsx`.
   - **Tests**: 22 tests in `dbsc.test.ts` and `dbsc.routes.test.ts`.

3. **T12.3 Sealed Vault v2 (True E2EE) (COMPLETE)**:
   - **ADR-015 Accepted**: Adopted Option 2 (Progressive WebCrypto Client-Side E2EE with ECDH P-256 and AES-KW).
   - **Shared Crypto**: `packages/shared/src/e2ee.ts` containing pure WebCrypto cryptographic engine for ECDH P-256 forward-secret key agreement, HKDF-SHA256, AES-KW key wrapping, and AES-256-GCM row-bound envelope encryption (`v2.e2ee...`).
   - **Schema**: `e2eeKeys` table in `schema.ts` holding enrolled participant public JWKs.
   - **Endpoints**: `POST /api/auth/e2ee/keys` and `GET /api/auth/e2ee/keys` in `e2ee.routes.ts`.
   - **Client**: `apps/web/src/lib/e2ee.ts` managing IndexedDB key vault (`sl_e2ee_vault`), auto-registration, and transparent unsealing.
   - **UI**: Seamless client-side unsealing with "✦ Hardware E2EE Sealed" badges in `MemoryPanel.tsx` and `LetterViewer.tsx`; interactive benchmark in `SecurityPanel.tsx`.
   - **Tests**: 11 unit tests in `packages/shared/src/e2ee.test.ts` and 5 route tests in `apps/api/src/routes/e2ee.test.ts`.

4. **T12.4 HLS Adaptive Bitrate Streaming (COMPLETE)**:
   - **ADR-016 Accepted**: Adopted Option 1 (Multi-bitrate HLS with signed URL CloudFront delivery).
   - **Worker Generator**: `apps/worker/src/hls.ts` generating RFC 8216 master playlist and segment media playlists across 1080p, 720p, 480p, and 360p profiles with 6-second segment chunking.
   - **API Access**: `apps/api/src/media/access.ts` supports `variant: 'hls'` returning signed CloudFront URLs for `_hls/<assetId>/master.m3u8` with 900s TTL.
   - **Client Player**: `apps/web/src/components/HLSPlayer.tsx` providing native Apple HLS on iOS/Safari, adaptive quality ladder switcher, progressive fallback, and seamless playback position preservation across signed URL renewals.
   - **Tests**: 5 unit tests in `apps/worker/src/hls.test.ts` and 4 access tests in `apps/api/src/media/access.test.ts`.

5. **T12.5 Map View**:
   - **ADR-017 Authored (Proposed / Deferred)**: Evaluated self-hosted Protomaps vs inline SVG vs text-only location. Text-only retained to preserve ADR-011 (zero third-party requests) and PRIV-03 (location privacy).

---

## 5. Operational Checklist for Go-Live

The application code, infrastructure definitions, and test suites are 100% complete. The remaining steps are manual operational actions reserved for the human Author:

1. **Infrastructure Provisioning**:
   - Run `terraform apply` in `infra/` targeting AWS primary region (`ap-south-1`).
2. **Soft Launch Verification**:
   - Run `pnpm cli soft-launch --confirm` to verify database health and generate the Recipient's one-time invite phrase.
3. **In-Person Enrollment (Task T11.6)**:
   - Physically meet the Recipient and guide them through enrolling their device passkey (e.g. TouchID / FaceID).
4. **Post-Launch Monitoring (Task T11.7)**:
   - Inspect CloudWatch alarms and AWS WAF metrics one week following initial launch.
