# Slow Light

A highly secure, private web application built for an intimate, personal experience. This repository contains the source code for the entire Slow Light project, encompassing the API, Web App, Worker, and infrastructure configurations.

> **Note**: This repository intentionally contains no private keys, secrets, personal media, or identifying information. All personal content is stored securely in the database (sealed via KMS) and private media buckets.

## System Architecture

Slow Light employs a stringent security-first architecture utilizing a Vite SPA with a vanilla Three.js engine on the frontend, and a Fastify API backed by PostgreSQL and AWS KMS on the backend.

- **Frontend (`apps/web`)**: React 19 SPA + Vanilla Three.js engine. All state transitions are strictly governed by an XState v5 state machine.
- **Backend (`apps/api`)**: Fastify 5 API. Enforces Row Level Security (RLS) on PostgreSQL and handles authentication and authorization (Passkeys). 
- **Database**: PostgreSQL with `FORCE ROW LEVEL SECURITY`. Sensitive text fields are sealed at rest using AES-256-GCM via a KMS envelope.
- **Media Worker (`apps/worker`)**: A sandboxed Fargate task that scans (ClamAV), sanitizes, and re-encodes uploaded media (sharp, ffmpeg) before placing it in the private media buckets.
- **Media Delivery**: CloudFront with Signed URLs (Same-Origin). Short TTLs prevent long-lived bearer URLs, and edge caching is disabled for maximum privacy.

## Project Structure

```text
slow-light/
├── apps/
│   ├── api/                # Fastify backend, Auth, Crypto, DB routing
│   ├── web/                # Vite React SPA + Three.js Engine
│   └── worker/             # Media processing worker (ffmpeg, sharp, ClamAV)
├── packages/
│   ├── config/             # Shared build-time configuration
│   ├── shared/             # Shared utilities, schemas, and PRNG logic
│   └── tokens/             # Design tokens and aesthetic guidelines
├── db/                     # PostgreSQL schema and Drizzle migrations
├── docs/                   # Authoritative documentation (see below)
├── infra/                  # Terraform AWS IaC and security headers
├── scripts/                # Utility scripts for bootstrapping
├── security/               # Threat models and security test matrices
└── tests/                  # Cross-workspace integration tests
```

## Documentation Resources

The `docs/` folder is the source of truth for all project specifications, decisions, and development history. 

### Core Documentation
- **`PRD.md`**: The Product Requirements Document, detailing the *what* and *why* of Slow Light.
- **`architecture.md`**: High-level system architecture, boundaries, and failure domains.
- **`rules.md` / `AGENTS.md`**: Mandatory engineering and stylistic rules for the project.
- **`design.md`**: The design system, aesthetic goals, and token guidelines.
- **`memory.md`**: A chronological project context and history log.
- **`task.md`**: The current execution task tracker.

### Specifications (`docs/spec/`)
The `docs/spec/` directory contains 36 meticulously detailed specification documents.
- **`00-front.md`**: The master table of contents and summary.
- **`21-json-schemas.md`**: Strict validation schemas for all data traversing the system.
- **`23-antigravity-engineering-rules.md`**: Coding standards.
- **`25-implementation-roadmap.md`**: The multi-phase roadmap dictating the build order.
- **`27-security-test-matrix.md`**: Threat modeling and required security assertions.
*(Refer to `docs/spec/00-front.md` for the complete list of specifications).*

### Architecture Decision Records (`docs/adr/`)
Contains all locked technical decisions (D-01 through D-12) outlining the rationale behind specific tech choices (e.g., vanilla Three.js vs R3F, strict Passkey-only auth).

## Development Setup

The repository uses `pnpm` workspaces. Ensure you have Node.js v22 (Active LTS) installed.

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Start local development servers (Web, API, Worker)
pnpm dev

# 3. Code Quality & Verification
pnpm lint        # Run ESLint across all workspaces
pnpm typecheck   # Strict TypeScript compiler verification
pnpm test        # Run Vitest unit & integration tests
```
