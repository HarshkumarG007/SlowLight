# AGENTS.md — Slow Light (Always-On Rule)

You are building a private, security-critical romantic web application. Source of truth: `docs/spec/` (start with 00-front, then 23, 24, 25).

## Non-negotiables
- Security > privacy > accessibility > correctness > performance > style.
- Never trust the client. Every route declares {auth, policy}. Postgres RLS is enforced. Unauthorized and missing objects return 404.
- No secrets in the frontend. No logs of private content. No third-party requests from the browser. No analytics.
- Photos/videos are DOM elements, never WebGL textures. Media only via `/_m/*` signed URLs after `POST /media/access`.
- Personal content is never hard-coded; it lives in the database (sealed) and comes from the API.
- Auth, authz, crypto, media-pipeline, and IAM changes need human review (CODEOWNERS).
- Never weaken a security control to make a test or demo pass — raise a blocker instead.

## Workflow
1. Read the relevant docs. 2. Inspect the repo. 3. Write a short plan (files, risks, tests). 4. Implement in small steps. 5. Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the phase's acceptance checks. 6. Report evidence and blockers. Do not modify unrelated files.

## Commands
```
pnpm i --frozen-lockfile   # install (lockfile enforced)
pnpm dev                   # start local dev servers
pnpm lint                  # ESLint (RULE-003/013/015/040/044/051/084)
pnpm typecheck             # tsc --noEmit (strict)
pnpm test                  # Vitest unit + integration
pnpm e2e                   # Playwright (includes virtual-authenticator flows)
pnpm build                 # production bundle (runs CSP/secret grep)
pnpm cli <cmd>             # CLI scripts: bootstrap | invite:create | admin-door | keys:rotate | restore-drill | export-escrow
```

## Style
TypeScript strict + `noUncheckedIndexedAccess`, ESM, named exports (no default exports except lazy route components), files ≤ 400 lines, no `any`, tokens instead of literals, CSS Modules with `@layer reset, tokens, base, components, utilities`, tests beside code, comments explain *why* not *what*.

## Module boundaries (enforced by dependency-cruiser in CI)
- `packages/shared` imports nothing app-specific
- `apps/web` may import `shared`, `tokens` — never `api`
- `apps/api` may import `shared`
- Within `api`: `routes → services → repositories → db`; only `repositories` touch SQL; only `crypto` touches KMS/keys; only `authz` decides permissions; only `media` touches S3
- The Engine (`apps/web/src/three/`) never reads React state; React never touches Three.js objects — communicate only via the typed command/event bus

## Stop and ask when
- A rule conflicts with the task
- A locked decision (D-01…D-12) would change — requires a new ADR + human approval
- A security-relevant ambiguity exists
- A new dependency is proposed (write a security/bundle evaluation first)
- You would need real personal data or real secrets
- Broad IAM permissions would be needed

## Project docs (read at the start of every session, in this order)
1. `PRD.md` — what and why
2. `architecture.md` — system overview
3. `rules.md` — development rules
4. `design.md` — design system
5. `task.md` — current task (work **one task at a time**)
6. `memory.md` — context log (read at start, **append** at end)

Then open the relevant `docs/spec/` documents for the phase you are working on.
