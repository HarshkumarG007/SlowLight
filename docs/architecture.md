# architecture.md — System Architecture (summary)
Authoritative detail: `docs/spec/` 08, 09, 10, 13, 14, 29. This file is the one-page skeleton the AI must keep in mind.

## 1. High-level flow
```
Browser (Vite SPA + Three.js engine)
  → CloudFront + WAF (TLS, geo allow-list, rate rules, Admin Door)
     ├ /, /assets/*  → S3 spa (OAC)
     ├ /api/*        → internal ALB → API (Fastify, Fargate)
     │                    ├ auth (passkeys, sessions, Knock)
     │                    ├ authz (policy.ts + Postgres RLS)
     │                    ├ RDS PostgreSQL (sealed fields, audit)
     │                    └ KMS (wrapped DEKs) · RunTask → media-worker
     └ /_m/*         → S3 media (private, SSE-KMS) via CloudFront signed URLs (no caching)
media-worker: quarantine → validate/scan/re-encode → media + vault
Backups: cross-account, Object Lock, KMS multi-Region keys, offline archive
```

## 2. Tech stack (locked; pin exact versions at setup)
| Layer | Choice |
|---|---|
| Language | TypeScript strict, ESM, pnpm workspaces |
| Frontend | Vite + React 19 SPA, CSS Modules + tokens, XState 5, TanStack Query |
| 3D | Vanilla Three.js engine + pmndrs `postprocessing` (no R3F) |
| API | Fastify 5 (Node Active LTS), zod, Drizzle, `pg`, pg-boss, SimpleWebAuthn |
| Data | PostgreSQL (RDS) with RLS; sealed fields (AES-256-GCM, KMS envelope) |
| Media | sharp, ffmpeg, heif-convert, ClamAV in an isolated worker |
| Infra | AWS: CloudFront, WAFv2, ALB (VPC origin), ECS Fargate, RDS, S3, KMS, Secrets Manager, CloudWatch/GuardDuty/CloudTrail |
| IaC/CI | Terraform, GitHub Actions with OIDC |
| Tests | Vitest, Testing Library, Playwright (+CDP virtual authenticator), axe, Testcontainers, fast-check, Lighthouse CI |

## 3. Folder organization
```
apps/web (src/app, features, three, ui, styles, lib, admin, public)
apps/api (src/routes, auth, authz, db, crypto, media, audit, jobs, observability, config)
apps/worker  packages/{shared,tokens,config}
db/migrations  infra  scripts  tests  docs  security
```
Dependency rules: `web` never imports `api`; only `repositories` touch SQL; only `crypto` touches keys; only `authz` decides permissions; only `media` touches S3; the Engine never reads React state. [09 §9.5, 19]

## 4. How the parts interact
- **Experience state machine (XState)** is the single source of "where she is"; React panels and the Engine talk only through a typed command/event bus. [18, 06]
- **Server state** lives in TanStack Query (never persisted); auth state is a server session (`__Host-` cookie); scene state is inside the Engine. [09 §9.4]
- **Authorization** = route guard → policy → repository scoping (`withActor`, `SET LOCAL`) → RLS.
- **Media:** `POST /media/access` authorizes, returns a short-lived same-origin signed URL; the browser fetches from `/_m/*`.
- **Content:** never hard-coded; loaded from the API; text sealed at rest.

## 5. Trust boundaries and failure domains
Internet↔edge, edge↔ALB, API↔DB, API↔AWS, worker↔untrusted files, browser (never trusted), Author device↔admin. KMS down → sealed reads 503; worker down → jobs retry; storage down → placeholders; WebGL lost → flat mode. [09 §9.2, 9.7]

## 6. Environments
Local (Docker: Postgres, MinIO, LocalKeyService—refused in production), staging (on demand), production. No production data below production.
