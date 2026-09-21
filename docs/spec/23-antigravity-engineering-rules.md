# 23 — ANTIGRAVITY ENGINEERING RULES

This is the engineering constitution. Precedence: **security rules > privacy rules > accessibility > correctness > performance > style.** Where two rules seem to conflict, stop and ask (Doc 24 §24.3). Each rule names how it is enforced (L = lint/static, T = test, C = CI gate, R = human review).

## 23.1 What to build
The system in Docs 01–22: Veil/Threshold, the 3D sky (Rail, lights, constellations, Unlit), Lamp Room, Logbook, memory panel and media viewer, passkey auth with Knock, policy + RLS authorization, sealed-field encryption, private media pipeline and signed same-origin access, Admin console behind the Admin Door, audit, backups, IaC, CI/CD, tests.

## 23.2 What NOT to build
Public pages, sharing, comments/replies (v1), analytics or third-party scripts, service-worker caching of private content, DRM/screenshot blocking, password login, email magic links, E2EE (v1), a CMS framework, microservices, Redis, GraphQL, any feature that reports on the Recipient's behavior to the Author, decorative animation, hearts/roses/confetti/counters.

## 23.3 Rules

### Security
- **RULE-001** Never expose private media through public static assets; media only via `/_m/*` signed URLs. (T, C: bucket-policy test)
- **RULE-002** Never trust client-side authorization; the UI may hide, the server decides. (T: authz matrix)
- **RULE-003** Never place secrets in frontend code or `VITE_*` variables; only PUBLIC vars may be embedded. (L, C: bundle grep)
- **RULE-004** Never log private content, tokens, cookies, raw media URLs, keys. Use allow-list serializers. (T: canary test)
- **RULE-005** Every protected route declares `{auth, policy}`; a test fails if any route lacks it. (T)
- **RULE-006** Every media URL is minted through `POST /media/access` after an authorization check. (T)
- **RULE-011** Authorization logic lives only in `authz/policy.ts`; queries run only through `withActor(tx)`; no raw pool outside `db/`. (L)
- **RULE-012** Unauthorized and nonexistent objects both return 404. (T)
- **RULE-013** All SQL is parameterized via Drizzle; string-built SQL is forbidden. (L)
- **RULE-014** Every request body is validated by a `.strict()` zod schema with max lengths; validate before use. (L, T)
- **RULE-015** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or inline event handlers; render SL-text with the first-party parser. (L)
- **RULE-016** CSP must stay `script-src 'self'; style-src 'self'`; never add `unsafe-inline`/`unsafe-eval`; fix the code instead. (C: header test)
- **RULE-017** Cookies: `__Host-`, Secure, HttpOnly, SameSite=Strict, no Domain. Never store session data in `localStorage`/`sessionStorage`. (T)
- **RULE-018** All state-changing routes enforce the CSRF layers (custom header, Origin, Fetch-Metadata, JSON only). (T)
- **RULE-019** Auth code changes only inside `auth/`; any change requires human review and updated tests. (R, C: CODEOWNERS)
- **RULE-020** Compare secrets and hashes in constant time; never roll your own crypto; use Node `crypto`/SimpleWebAuthn/Argon2id. (R)
- **RULE-021** Sealed fields are read/written only through `crypto/sealed.ts` with row-bound AAD; never store plaintext in a `*_sealed` column. (T)
- **RULE-022** Destructive admin actions require type-to-confirm + step-up and are soft-deletes first. (T)
- **RULE-023** Uploads go only to quarantine; nothing reaches `media` without passing the worker pipeline. (T)
- **RULE-024** Never call `ffmpeg`/`heif-convert`/`clamscan` with a shell string; use argument arrays, a protocol allow-list and hard timeouts. (L, R)

### Data and API
- **RULE-030** IDs are UUIDv4; never expose sequential IDs or storage keys. (T)
- **RULE-031** Never hard-code personal content (names, greetings, memories, dates) in code, fixtures shipped to production, or UI components; use `site_texts`/API. (L: forbidden-strings list, R)
- **RULE-032** All API responses use the envelope and error catalogue (Doc 15); no raw exceptions to clients. (T)
- **RULE-033** PATCH/DELETE require `If-Match`; return 412 on mismatch. (T)
- **RULE-034** Migrations are additive first (expand/contract); never edit an applied migration; never auto-run destructive SQL. (C, R)
- **RULE-035** Time-based visibility (`publish_at`, `unlock_at`) uses the database clock only. (T)
- **RULE-036** Never send locked letter bodies or unpublished content to any client, even hidden. (T)
- **RULE-037** Do not add fields that let the Author observe Recipient behavior (opens, visit counts, durations). (R)

### UI and design
- **RULE-040** No literal colors, sizes, durations, z-indexes in components; use tokens (Doc 22). (L)
- **RULE-041** Obey banned patterns (Doc 05 §5.9): no eyebrow labels, all-caps tracked labels, identical card grids, gradient washes, hover lifts, fade-slide-up everywhere. (R)
- **RULE-042** Do not add decorative animation without a purpose that maps to R1–R8 or an input response. (R)
- **RULE-043** Copy uses two registers (Doc 02 §2.6); errors are specific, no apology, no "Oops". (R)
- **RULE-044** CSS Modules with `@layer reset, tokens, base, components, utilities`; no Tailwind, no CSS-in-JS runtime. (L)
- **RULE-045** Self-host all fonts and assets; no third-party requests from the browser. (T: network allow-list in e2e)

### 3D
- **RULE-050** Photos/videos are never WebGL textures (D-03). (R)
- **RULE-051** The Engine never reads React state; React never touches Three.js objects; communicate via the typed bus. (L: dependency-cruiser)
- **RULE-052** Every GPU resource is registered in `ResourceTracker` and disposed; disposal test must pass. (T)
- **RULE-053** No allocations in the frame loop; no `new` of vectors/colors per frame. (T: allocation counter)
- **RULE-054** Layout must be deterministic (`packages/shared/layout.ts`); never use `Math.random()` for placement. (T: property test)
- **RULE-055** Support all quality tiers, reduced motion, and the flat mode before adding any new 3D feature. (T)
- **RULE-056** Pause rendering when hidden; respect the adaptive governor; never raise DPR above the tier cap. (T)

### Accessibility
- **RULE-060** Do not sacrifice accessibility for 3D visuals: every capability of the sky exists in the DOM mirror/Logbook. (T: axe + keyboard e2e)
- **RULE-061** Every interactive element is keyboard-operable with a visible focus ring; targets ≥ 44 px on touch. (T)
- **RULE-062** Honor `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`. (T)
- **RULE-063** All images have `alt`; audio/video with speech have captions or transcripts. (T, admin publish validation)

### Performance
- **RULE-070** Respect budgets in Doc 28; CI fails on regressions (`size-limit`, Lighthouse CI, frame-time bench). (C)
- **RULE-071** Code-split: the world chunk loads only after authentication; the Veil stays ≤ 120 KB gz. (C)
- **RULE-072** No autoplay of audio/video; audio context only after a user gesture. (T)

### Dependencies, testing, process, infra
- **RULE-007** Do not introduce a dependency without evaluating security posture, maintenance, license, and bundle impact; write it in the PR. (R)
- **RULE-080** Pin versions; lockfile committed; `--frozen-lockfile`; install scripts off unless allow-listed; new versions ≥ 3 days old. (C)
- **RULE-081** Write the test first for auth, authz, crypto, and media code; keep 100% branch coverage on `auth/`, `authz/`, `crypto/`. (C)
- **RULE-082** Tests use synthetic data only; never real memories or real credentials. (R)
- **RULE-083** A phase is done only when its acceptance criteria (Doc 25 Part B) pass; report evidence. (R)
- **RULE-084** No `any`, no `@ts-ignore` without a linked issue; TypeScript strict. (L)
- **RULE-085** Infrastructure changes go through Terraform plan review; never click-ops; no wildcard IAM (`*` action or resource) without a written justification. (C: policy scan)
- **RULE-086** Never commit `.env` files, keys, dumps or real media; gitleaks in pre-commit and CI. (C)
- **RULE-087** Never weaken a security control to make a test or demo pass; raise it as a blocker instead. (R)
- **RULE-088** Large architectural changes require an ADR stating consequences, alternatives, and rollback; ask the human first. (R)

## 23.4 Repository `AGENTS.md` (root; mirror into `.agents/rules/` as Always-On rules)
<!-- extract: AGENTS.md -->
```markdown
# AGENTS.md — Slow Light

You are building a private, security-critical romantic web application. Source of truth: `docs/` (start with 00-front, then 23, 24, 25).

## Non-negotiables
- Security > privacy > accessibility > correctness > performance > style.
- Never trust the client. Every route declares {auth, policy}. Postgres RLS is enforced. Unauthorized and missing objects return 404.
- No secrets in the frontend. No logs of private content. No third-party requests from the browser. No analytics.
- Photos/videos are DOM elements, never WebGL textures. Media only via /_m/* signed URLs after POST /media/access.
- Personal content is never hard-coded; it lives in the database (sealed) and comes from the API.
- Auth, authz, crypto, media-pipeline, and IAM changes need human review (CODEOWNERS).

## Workflow
1. Read the relevant docs. 2. Inspect the repo. 3. Write a short plan (files, risks, tests). 4. Implement in small steps. 5. Run: pnpm lint, typecheck, test, and the phase's acceptance checks. 6. Report evidence and blockers. Do not modify unrelated files.

## Commands
pnpm i --frozen-lockfile | pnpm dev | pnpm lint | pnpm typecheck | pnpm test | pnpm e2e | pnpm build | pnpm cli <cmd>

## Style
TypeScript strict, ESM, named exports, files ≤ 400 lines, no `any`, tokens instead of literals, CSS Modules with @layer, tests beside code.

## Stop and ask when
A rule conflicts with the task; an ADR would change; a security-relevant ambiguity exists; a dependency is proposed; you would need real personal data or real secrets.
```
