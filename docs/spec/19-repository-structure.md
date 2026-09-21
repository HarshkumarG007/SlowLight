# 19 — REPOSITORY STRUCTURE

pnpm workspace monorepo (no Turborepo needed).
```text
slow-light/
├── AGENTS.md                      # engineering constitution for coding agents (Doc 23/24)
├── .agents/{rules,workflows}/     # Antigravity rules/workflows mirroring AGENTS.md (paths changed between versions: verify)
├── apps/
│   ├── web/                       # Vite SPA: viewer (index.html) + admin (admin.html)
│   │   ├── src/app/               # router, providers, experience.machine.json + implementation
│   │   ├── src/features/          # veil, threshold, world, memory, viewer, letters, logbook, unlit, settings, audio
│   │   ├── src/three/             # Engine: renderer, loop, stages, systems, shaders, resources
│   │   ├── src/ui/                # primitives (Button, Dialog, Sheet, Scrubber…), no business logic
│   │   ├── src/styles/            # tokens.css (generated), layers.css, base.css
│   │   ├── src/lib/               # api client (typed from shared), sl-text renderer, a11y helpers
│   │   ├── src/admin/             # authoring console (separate entry)
│   │   └── public/                # fonts (self-hosted), ambient audio (generic), icons, robots.txt, manifest
│   ├── api/
│   │   ├── src/server.ts          # Fastify bootstrap, plugins, headers
│   │   ├── src/routes/            # one file per group; each route declares {auth, policy}
│   │   ├── src/auth/              # ceremonies, sessions, knock, recovery (single module)
│   │   ├── src/authz/             # policy.ts, withActor.ts
│   │   ├── src/db/                # pool (IAM auth), drizzle schema, repositories/, migrations runner
│   │   ├── src/crypto/            # sealed.ts, keyring.ts, KeyService (KMS | Local dev)
│   │   ├── src/media/             # signing, upload intents, S3 clients
│   │   ├── src/audit/             # append + hash chain
│   │   ├── src/jobs/              # pg-boss handlers (light)
│   │   ├── src/observability/     # pino allow-list serializers, metrics
│   │   └── src/config/            # env schema (zod), runtime config
│   └── worker/                    # media pipeline (sharp, ffmpeg, heif-convert, clamav), Dockerfile
├── packages/
│   ├── shared/                    # zod schemas, types, error codes, layout.ts, sl-text parser, date utils
│   ├── tokens/                    # tokens.json + build (CSS vars, TS)
│   └── config/                    # site.config.json + schema
├── db/migrations/                 # 0001_init.sql … (reviewed SQL); db/schema.descriptor.json
├── infra/                         # Terraform: network, edge, compute, data, kms, backup, observability, iam; security-headers.json
├── scripts/                       # cli: bootstrap, invite:create, admin-door, keys:rotate, restore-drill, export-escrow
├── tests/                         # cross-package: authz matrix, rls, e2e (Playwright), perf, security
├── docs/                          # this specification split per document, adr/, runbooks/
├── security/threat-model.json
├── .github/workflows/             # ci.yml, security.yml, deploy.yml (OIDC)
├── .env.example  .gitignore  .gitleaks.toml  .dependency-cruiser.cjs  pnpm-workspace.yaml  package.json  README.md
```
Conventions: TypeScript `strict`, `noUncheckedIndexedAccess`, ESM; named exports (no default exports except route-level lazy components); files ≤ 400 lines; feature folders own their components/hooks/tests; no barrel files that hide boundaries; naming: `kebab-case` files, `PascalCase` components, `camelCase` functions; errors are typed `AppError(code)`; no `any` (lint error); no `console.*` in production code.
