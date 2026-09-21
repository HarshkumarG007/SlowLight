# 26 — TESTING STRATEGY

| Layer | Tools | What is tested | Gate |
|---|---|---|---|
| Unit | Vitest, fast-check | Layout determinism/property tests, ramp, SL-text parser (fuzz for injection), date utils, `sealed.ts` (round-trip, AAD mismatch, tamper, nonce uniqueness), policy functions, rate-limit math | ≥ 90% lines; 100% branches in `auth/`, `authz/`, `crypto/` |
| Integration | Vitest + Testcontainers (real Postgres, MinIO) | Repositories with the real migration; **RLS suite** (recipient/author/no-role, letter time lock via DB clock, media reachability); audit append-only; pg-boss jobs | all pass |
| API | `fastify.inject`, OpenAPI contract tests | Envelope, error catalogue, validation, If-Match, idempotency, pagination, headers (CSP, cookies), 404-not-403 | all routes covered |
| Authentication | Playwright + Chromium CDP virtual authenticator | Enrollment (link+phrase, single-use, expiry, attempts), login, step-up, add/revoke device, sessions, recovery, Knock, ephemeral, replay/tamper/origin/RP-ID/counter tests | 100% of Doc 16 flows |
| Authorization | Generated matrix test | Every route × {anonymous, recipient, author, non-elevated author, disabled user} against Doc 17 | zero unexpected allows |
| Security | ZAP baseline, Semgrep, gitleaks, OSV, Trivy, Checkov/tfsec, custom canary log test, bundle secret grep | Doc 27 matrix | no high findings |
| Component | Vitest + Testing Library | Panel, Viewer (focus trap, keys), Scrubber, Logbook, SL-text render, error states | pass |
| 3D | Vitest (headless engine math) + Playwright with SwiftShader | Camera damping, picking, tier governor, disposal (`renderer.info`), 50× open/close leak test, context-loss recovery, deterministic frame capture (`?freeze`, dev only) with tolerant screenshot diff | no leaks; no allocations |
| Accessibility | axe-core in Playwright, keyboard-only scripts, manual NVDA/VoiceOver pass | Doc 04 §4.8 | 0 serious/critical |
| Performance | Lighthouse CI, `size-limit`, Playwright with CPU 4× + Fast 4G, frame-time sampling | Doc 28 budgets | no regression > 10% |
| End-to-end | Playwright | Veil → login → Threshold → world → memory → viewer → letter (locked/unlocked) → Logbook → Unlit → Rest → logout; admin flow with Door open | green on Chromium/WebKit/Firefox |
| Mobile | Playwright device emulation (iPhone 15, Pixel 8, iPad) + real devices | safe areas, dvh, touch, orientation, autoplay | Doc 25 MOB |
| Browser compat | Chromium, WebKit, Firefox; manual Edge | WebAuthn, WebGL2, video/audio formats (AVIF, H.264/AAC, Opus) | matrix in CI |
| Infra | `terraform validate/plan`, conftest policies, post-deploy smoke, Config rule checks | private buckets, no public ACLs, IAM least privilege | pass |
| Recovery | `scripts/restore-drill` | Restore DB PITR + media to scratch; verify checksums and login | quarterly, results filed |

**Data policy:** synthetic fixtures only; media fixtures are generated (gradients/noise); no real credentials. **CI stages:** lint → typecheck → unit → integration → build → e2e/a11y → perf → security → (main) deploy with manual approval. **Flake policy:** a flaky test is quarantined within 24 h and fixed within a week; never retried silently more than once.
