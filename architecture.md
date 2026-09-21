# architecture.md — System Architecture (summary)
Authoritative detail: `docs/spec/` 08, 09, 10, 13, 14, 29. This file is the one-page skeleton the agent must keep in mind every session.

## 1. High-level flow
```
Browser (Vite SPA + Three.js engine)
  → CloudFront + WAF (TLS, geo allow-list, rate rules, Admin Door)
     ├ /, /assets/*  → S3 spa (OAC)
     ├ /api/*        → internal ALB (VPC origin) → API (Fastify, Fargate)
     │                    ├ auth (passkeys, sessions, Knock)
     │                    ├ authz (policy.ts + Postgres RLS)
     │                    ├ crypto (sealed.ts, KMS key ring)
     │                    ├ RDS PostgreSQL (sealed fields, audit, pg-boss jobs)
     │                    └ KMS (wrapped DEKs) · ecs:RunTask → media-worker
     └ /_m/*         → S3 media (private, SSE-KMS) via CloudFront signed URLs
                       (no CDN caching; short TTL: image 90s, audio 600s, video 900s)
media-worker (sandboxed Fargate task): quarantine → validate/ClamAV/re-encode → media + vault
Backups: cross-account Object Lock, KMS multi-Region keys, PITR 35d, offline archive
Admin console: second SPA entry (admin.html) on a separate hostname
              only reachable when the Admin Door WAF rule is open
```

## 2. Tech stack (locked; pin exact versions at setup — verify advisories)
| Layer | Choice |
|---|---|
| Language | TypeScript strict + `noUncheckedIndexedAccess`, ESM, pnpm workspaces |
| Frontend | Vite 7+ + React 19 SPA, CSS Modules + design tokens, XState 5, TanStack Query, Zustand (UI prefs only) |
| 3D | Vanilla Three.js engine + pmndrs `postprocessing` (no R3F/drei) |
| API | Fastify 5 (Node Active LTS), zod, Drizzle, `pg`, pg-boss, `@simplewebauthn/server` |
| Data | PostgreSQL (RDS) with `FORCE ROW LEVEL SECURITY`; sealed fields (AES-256-GCM, KMS envelope) |
| Media | sharp (libvips), ffmpeg, heif-convert, ClamAV in an isolated worker task |
| Infra | AWS: CloudFront + WAFv2, internal ALB (VPC origin), ECS Fargate, RDS, S3, KMS, Secrets Manager, CloudWatch/GuardDuty/CloudTrail |
| IaC/CI | Terraform, GitHub Actions with OIDC (no long-lived keys) |
| Tests | Vitest + Testcontainers, Testing Library, Playwright + CDP virtual authenticator, axe-core, fast-check, Lighthouse CI |

## 3. Folder organization
```
apps/web   (src/app, features, three, ui, styles, lib, admin, public)
apps/api   (src/routes, auth, authz, db, crypto, media, audit, jobs, observability, config)
apps/worker
packages/  (shared, tokens, config)
db/migrations  infra  scripts  tests  docs  security
```
Dependency rules enforced by dependency-cruiser in CI: [09 §9.5, 19]
- `web` never imports `api`; only `repositories` touch SQL; only `crypto` touches keys
- only `authz` decides permissions; only `media` touches S3
- The Engine (`three/`) never reads React state — communicate only via the typed bus

## 4. How the parts interact
- **Experience state machine (XState v5)** is the single source of "where she is"; React panels and the Engine talk only through a typed command/event bus. [18, 06]
- **Server state** lives in TanStack Query (never persisted to storage); auth state is a server session (`__Host-` cookie); scene state is inside the Engine; UI preferences (audio, tier) in `localStorage` via a small Zustand store. [09 §9.4]
- **Authorization** = route guard → `authz/policy.ts` → repository scoping (`withActor`, `SET LOCAL app.role/app.user_id`) → RLS. Every route declares `{auth, policy}`. [17]
- **Media:** `POST /media/access` authorizes → returns a short-lived same-origin signed CloudFront URL (`/_m/*`). Browser fetches directly — never through the API. [14, 15 M1]
- **Content:** never hard-coded; loaded from the API; text fields are sealed at rest (AES-256-GCM). [06, 21]
- **Admin:** only reachable when the Admin Door WAF rule is open AND the Author has a passkey session with elevation. [10 §10.8]
- **Uploads:** presigned POST to S3 quarantine → `media-worker` processes → variants in `media`, original in `vault`. API role cannot read vault. [14]

## 5. Trust boundaries and failure domains
TB1 Internet ↔ edge (CloudFront/WAF) · TB2 edge ↔ internal ALB (VPC origin) · TB3 API ↔ DB (IAM-auth TLS, RLS) · TB4 API ↔ AWS APIs (task role, least-privilege) · TB5 worker ↔ untrusted files (sandboxed, own role) · TB6 browser (never trusted for authorization) · TB7 Author device ↔ admin (Admin Door + passkey + elevation). [09 §9.2, 9.7]

**Failure modes:**
- KMS unavailable → sealed reads return `503 SEALED_UNAVAILABLE`; auth and non-sealed fields keep working
- Worker failure → jobs retry (max 3) then `failed` with Author alert
- S3 issues → media placeholders; text still loads
- WebGL context loss → flat mode without reload
- API task crash → ECS restarts, ALB health-checks gate traffic

## 6. Environments
- **Local:** Docker Compose — Postgres 16, MinIO (local S3), `LocalKeyService` stub (`KEY_SERVICE=local` — **refused in production build**)
- **Staging:** on-demand Terraform workspace, scaled-down, synthetic data only
- **Production:** identical artifacts promoted from staging; no production data ever in lower environments
