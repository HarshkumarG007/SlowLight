# 08 — TECH STACK DECISION

## 8.1 Method
Criteria (weighted): attack surface (25%), simplicity/auditability (20%), privacy (15%), buildability by a coding agent (15%), performance (15%), cost (10%). Every choice below names what was rejected and why.

## 8.2 Evaluations
| Layer | Options considered | Decision | Why / trade-off |
|---|---|---|---|
| Frontend framework | Next.js (App Router/RSC), Remix/React Router, SvelteKit, Astro, **Vite + React SPA** | **Vite + React 19 SPA** | Nothing needs SSR (no SEO, private). 2025 brought a Next.js middleware auth bypass (CVE-2025-29927) and a critical RSC RCE (CVE-2025-55182): a smaller server surface is a security feature. Trade-off: no SSR/streaming; irrelevant here |
| 3D | React Three Fiber + drei; **vanilla Three.js**; Babylon; raw WebGL | **Vanilla Three.js engine** | Explicit disposal, headless-testable layout/camera, no React re-render coupling, smaller bundle. Cost: more imperative code, mitigated by ResourceTracker |
| Post-processing | three examples EffectComposer; **pmndrs `postprocessing`** | pmndrs | Merges effects into one pass |
| Client state | Redux; Zustand; **XState v5 + TanStack Query + tiny stores** | XState for the experience machine, TanStack Query for server state, Zustand only for UI prefs | Machine = Doc 18 verbatim; server state never copied into stores |
| Styling | Tailwind; CSS-in-JS; **CSS Modules + tokens + `@layer`** | CSS Modules | CSP-friendly, no runtime, avoids utility-class "template look" |
| Animation | Framer Motion, GSAP; **CSS + Web Animations API + custom spring** | none | ≤ 8 DOM transitions in the product; saves ~40–100 KB; FLIP via WAAPI for Unfold |
| Backend | Next API routes, NestJS, Express, Hono; **Fastify 5** | **Fastify** (Node 24 LTS or current Active LTS) | Mature, schema-first, first-party security plugins (`helmet`, `rate-limit`, `cookie`); Hono would also work — chosen for auditability over portability |
| Validation | Ajv; **zod** shared with the client | zod in `packages/shared` | One schema → types, runtime validation, OpenAPI |
| Database | **PostgreSQL**; Aurora Serverless; DynamoDB; SQLite/Turso | **RDS PostgreSQL** (latest major RDS supports) | Row-Level Security, FTS not needed, mature PITR. Aurora scale-to-zero adds resume latency; DynamoDB lacks RLS/relational integrity |
| ORM / migrations | Prisma, Kysely, **Drizzle + reviewed SQL migrations** | Drizzle | Thin, SQL-visible, works with per-transaction `SET LOCAL` for RLS |
| Job queue | SQS, Redis/BullMQ, **pg-boss** | pg-boss | Same datastore, `SKIP LOCKED`, no new service |
| Authentication | Auth0/Clerk, Cognito, Auth.js, Better Auth, **first-party module on SimpleWebAuthn** | First-party, ≤ 1,500 LOC in one module | Two accounts, no third party may see logins, we need exact session semantics and RLS integration. Risk (custom auth) mitigated by library-verified ceremonies, 100% branch coverage, human review (A-14) |
| Object storage | **S3**, R2, B2, MinIO | S3 (MinIO for local dev) | SSE-KMS with separate key policies, Object Lock, replication |
| Media processing | **sharp (libvips)**, **ffmpeg**, `heif-convert`, ClamAV | as listed | Re-encode-everything is the main sanitizer (Doc 14) |
| CDN/WAF | **CloudFront + WAFv2**, Cloudflare | CloudFront | Same-origin `/_m/*` signed URLs, OAC to private S3, one IAM plane |
| Compute | **ECS Fargate**, Lambda, EC2, Vercel | Fargate (`api` service; on-demand `media-worker` task) | No host to patch; long-lived process for key ring cache |
| IaC | **Terraform/OpenTofu**, CDK | Terraform | Widest agent familiarity, plan review |
| CI/CD | **GitHub Actions + OIDC**, CodePipeline | GitHub Actions | No long-lived cloud keys |
| Observability | Datadog/Sentry vs **CloudWatch + pino** | CloudWatch | No third party sees telemetry |
| Testing | **Vitest, Testing Library, Playwright (+CDP virtual authenticator), axe-core, Testcontainers, fast-check, Lighthouse CI** | as listed | Doc 26 |

## 8.3 Locked stack (final)
TypeScript strict everywhere · pnpm workspaces · Vite 7+/React 19 · Three.js (latest stable, pinned) + `postprocessing` · XState 5 · TanStack Query · CSS Modules · Fastify 5 · zod · Drizzle · `pg` · pg-boss · `@simplewebauthn/server|browser` · `@aws-sdk/*` v3 (S3, KMS, CloudFront signer, RDS signer, SES) · pino · sharp · ffmpeg · Vitest · Playwright · Terraform · AWS. **Pin exact versions at project creation and verify current advisories; do not trust this document's version hints.**

## 8.4 Dependency policy
Lockfile committed; `pnpm install --frozen-lockfile`; install scripts disabled by default with an explicit allow-list; new package versions must be ≥ 3 days old (pnpm `minimumReleaseAge` or Renovate); OSV/`pnpm audit` in CI; license allow-list (MIT/Apache-2.0/BSD/ISC/OFL); web production dependencies ≤ 25 direct; any new dependency requires a note on security posture and bundle impact (RULE-007).

## 8.5 Deliberately not built (simple + auditable over impressive + fragile)
End-to-end encryption (v1), mTLS, WAF Bot Control, HSM, ML anomaly detection, image watermarking, DRM, screenshot/right-click blocking, service-worker offline cache of private content, GraphQL, microservices, Redis, Kubernetes.

## 8.6 ADR index
ADR-001 SPA over Next.js · 002 vanilla Three · 003 photos in DOM · 004 passkey-only · 005 RLS · 006 sealed text via KMS envelope · 007 same-origin signed media · 008 originals CLI-only · 009 AWS reference · 010 Admin Door · 011 no analytics · 012 no E2EE v1. Store as `docs/adr/NNN-*.md`; any change to a locked decision requires a new ADR plus human approval.
