# rules.md — Development Rules & AI Guidelines
Binding for the AI coding assistant. Full rule set (RULE-001…088) in `docs/spec/23-*.md`; `AGENTS.md` mirrors it. Priority: **security > privacy > accessibility > correctness > performance > style**.

## 1. Working protocol
1. Work on **one task at a time** from `task.md`; do not start the next one unasked.
2. Before coding: read relevant docs, inspect the repo, state a short plan (files, risks, tests).
3. Small commits; tests first for auth, authz, crypto, media.
4. After each task: run lint, typecheck, tests; update `task.md` (tick) and `memory.md` (log).
5. If a rule conflicts with the task, or an ADR-level change or real secret/personal data is needed: **stop and ask**.

## 2. Do
- Enforce authorization on the server for every route (`{auth, policy}`); return 404 for unauthorized/missing objects.
- Validate every input with strict zod schemas; parameterized SQL via Drizzle only.
- Use design tokens for every color/size/duration/z-index.
- Keep photos/videos in the DOM; media only via `/_m/*` signed URLs after `POST /media/access`.
- Dispose every GPU resource (`ResourceTracker`); keep the frame loop allocation-free; deterministic layout.
- Support reduced motion, all quality tiers, and flat mode before adding any 3D feature.
- Use placeholders/synthetic data; keep `.env.example` updated with placeholders only.

## 3. Avoid (never)
- Secrets in the frontend or repo; logging private content, tokens, cookies, raw media URLs, keys.
- Client-side authorization, hidden-route/obfuscation "security", HTML rendering of user text (`dangerouslySetInnerHTML`, `innerHTML`, `eval`).
- Third-party requests/analytics/CDNs from the browser; `unsafe-inline`/`unsafe-eval` in CSP.
- Hard-coded personal content; real memories in fixtures.
- Features that show the Author what the Recipient does (opens, visits, durations).
- Decorative animation, hearts/confetti/counters, card grids, gradient washes, eyebrow/ALL-CAPS labels.
- New dependencies without a security/bundle note; `any`; `@ts-ignore` without an issue; weakening a security control to pass a test.

## 4. Preferred libraries (do not swap without an ADR)
React, Vite, Three.js, `postprocessing`, XState, TanStack Query, Fastify (+helmet, cookie, rate-limit), zod, Drizzle, `pg`, pg-boss, `@simplewebauthn/*`, AWS SDK v3, pino, sharp, Vitest, Playwright, axe-core, Testcontainers, fast-check. No: Next.js, R3F/drei, Tailwind, Framer Motion/GSAP, Redux, Prisma, Redis, GraphQL.

## 5. Coding standards
TypeScript strict + `noUncheckedIndexedAccess`; ESM; named exports; files ≤ 400 lines; kebab-case files, PascalCase components, camelCase functions; tests beside code; comments explain *why*; no `console.*` in production code; CSS Modules with `@layer reset, tokens, base, components, utilities`.

## 6. Error handling protocol
- API: typed `AppError(code)` → envelope `{success:false,error:{code,message,requestId}}`; catalogue in spec 15 §15.2; never leak internals or values.
- Client: every network failure has a calm UI state (retry, placeholder); never show raw errors, URLs, or stack traces.
- Machine: every invoked actor has an `onError` transition; no dead states.
- Logging: allow-list serializers; log an error code and requestId, never content.
- Security failures fail closed (e.g., KMS unavailable → 503 for sealed content; Knock delivery failure → no access).

## 7. Definition of done (per task)
Acceptance criteria (spec 25 Part B IDs) pass with evidence; tests added; docs/`.env.example` updated; no TODO in security-critical code; `task.md` ticked; `memory.md` updated; human review requested for auth/authz/crypto/media/IAM.

## 8. Report format after each task
Done (evidence) · Acceptance IDs (pass/fail) · Security notes · Blockers/questions · Next.
