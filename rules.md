# rules.md — Development Rules & AI Guidelines
Binding for the AI coding assistant. Full rule set (RULE-001…088) in `docs/spec/23-*.md`; `AGENTS.md` mirrors the summary. Priority: **security > privacy > accessibility > correctness > performance > style**.

## 1. Working protocol
1. Work on **one task at a time** from `task.md`; do not start the next one without being asked.
2. Before coding: read relevant docs, inspect the repo, state a short plan (files, risks, tests to write first).
3. Tests first for auth, authz, crypto, and media code. Small, focused commits; one concern per commit.
4. After each task: run `pnpm lint`, `pnpm typecheck`, `pnpm test`; update `task.md` (tick the task) and `memory.md` (append the session log).
5. If a rule conflicts with the task, an ADR-level change is needed, a security-relevant ambiguity exists, or real secret/personal data would be required: **stop and ask**.

## 2. Do
- Enforce authorization on the server for every route (`{auth, policy}` declared); return **404** for both unauthorized and missing objects (no existence oracle).
- Validate every input with `.strict()` zod schemas with max lengths; parameterize SQL via Drizzle only — no raw SQL strings.
- Use design tokens for every color, size, duration, and z-index. No literals in component code.
- Keep photos/videos in the DOM (`<img>`, `<video>`) — never WebGL textures. Media only via `/_m/*` signed URLs after `POST /media/access`.
- Dispose every GPU resource via `ResourceTracker`; keep the render loop allocation-free (no `new Vector3()` per frame); layout via `layoutLights()` is always deterministic.
- Support reduced motion, all six quality tiers, and flat mode before adding any new 3D feature.
- Use synthetic placeholders in tests; keep `.env.example` updated with placeholder values only.
- Add `Idempotency-Key` support on admin POST routes; enforce `If-Match` on PATCH and DELETE (return 412 on mismatch).
- On PATCH/DELETE: return `412 VERSION_MISMATCH` on ETag mismatch; never silently overwrite.

## 3. Avoid (never)
- Secrets in the frontend bundle, in `VITE_*` variables, or in git history; logging private content, story text, tokens, cookies, raw media URLs, or encryption keys.
- Client-side authorization decisions; hidden-route / obfuscation "security"; rendering user text with `dangerouslySetInnerHTML`, `innerHTML`, or `eval`.
- Third-party requests, analytics, or external CDN assets from the browser; `unsafe-inline` or `unsafe-eval` in CSP; `new Function`.
- Hard-coded personal content (names, memories, greetings, dates) in code or shipped fixtures; real memories in test data.
- Features that expose the Recipient's behavior to the Author (opens, visit counts, durations, favorites).
- Decorative animation without a purpose mapped to R1–R8 or an input response; hearts, confetti, counters, streaks, read receipts.
- Card grids, gradient washes, eyebrow/ALL-CAPS labels, hover lift/scale, emoji as UI elements.
- New dependencies without a written security/bundle/license evaluation (RULE-007); `any`; `@ts-ignore` without a linked issue; weakening a security control to pass a test.
- Shell-string calls to `ffmpeg`, `sharp`, `clamscan` — use argument arrays, a protocol allow-list, and hard timeouts.

## 4. Preferred libraries (do not swap without an ADR + human approval)
**Keep:** React 19, Vite 7+, Three.js (pinned stable), `postprocessing` (pmndrs), XState 5, TanStack Query, Zustand (UI prefs only), Fastify 5 (+ `@fastify/helmet`, `@fastify/cookie`, `@fastify/rate-limit`), zod, Drizzle, `pg`, pg-boss, `@simplewebauthn/server` + `@simplewebauthn/browser`, `@aws-sdk/*` v3, pino, sharp, ffmpeg, Vitest, Playwright, axe-core, Testcontainers, fast-check, Lighthouse CI.

**Never use:** Next.js, React Three Fiber / drei, Tailwind CSS, Framer Motion, GSAP, Redux, Prisma, Redis, GraphQL, any third-party analytics or observability SDK that sends data externally.

## 5. Coding standards
- TypeScript strict + `noUncheckedIndexedAccess`; ESM throughout; named exports (no default exports except lazy route components)
- Files ≤ 400 lines; kebab-case filenames, PascalCase components, camelCase functions
- Tests beside code (e.g., `sealed.test.ts` next to `sealed.ts`); tests use synthetic data only
- Comments explain *why*, not *what*; no `console.*` in production code
- CSS Modules with `@layer reset, tokens, base, components, utilities`; no Tailwind; no CSS-in-JS runtime
- No barrel files that hide module boundaries; errors typed as `AppError(code)`

## 6. Error handling protocol
- **API:** typed `AppError(code)` → envelope `{ "success": false, "error": { "code", "message", "requestId", "details": [] } }`. Error catalogue (spec 15 §15.2) — key codes: `NOT_FOUND`, `VALIDATION_FAILED`, `AUTH_REQUIRED`, `SESSION_EXPIRED`, `STEP_UP_REQUIRED`, `FORBIDDEN`, `KNOCK_REQUIRED`, `CONFLICT`, `VERSION_MISMATCH`, `LETTER_SEALED`, `RATE_LIMITED`, `INTERNAL`, `SEALED_UNAVAILABLE`. Never leak internal values or stack traces.
- **Client:** every network failure has a calm UI state (retry, placeholder); never show raw errors, URLs, or stack traces.
- **State machine:** every invoked actor has an `onError` transition; no dead end states.
- **Logging:** allow-list serializers only; log error code + `requestId` — never content bodies, tokens, or media URLs.
- **Security failures fail closed:** KMS unavailable → 503 `SEALED_UNAVAILABLE` for sealed content (non-sealed content keeps working); Knock delivery failure → session stays pending (no access).

## 7. Definition of done (per task)
All of:
- Acceptance criteria from spec 25 Part B pass with evidence (test output or command output)
- Tests added for the new behavior
- `task.md` ticked for the completed task
- `memory.md` session log appended
- `docs/DECISIONS.md` updated for any non-ADR-level design choice made
- `.env.example` updated if any new environment variable was added (placeholder values only)
- No `TODO` left in security-critical code (`auth/`, `authz/`, `crypto/`, `media/`, `infra/`)
- Human review requested via PR for any change to `auth/`, `authz/`, `crypto/`, `apps/worker/`, `infra/`

## 8. Report format after each task
```
Done:               (what was built, with evidence — test names, command outputs)
Acceptance IDs:     (each ID from spec 25 Part B → pass / fail / not-applicable, with proof)
Security notes:     (new inputs, boundaries, secrets, or log lines introduced; how each is controlled)
Blockers/questions: (explicit, numbered; what is needed and why)
Next:               (next task ID and any prerequisites)
```
