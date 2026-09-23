# Slow Light — A Hardware-Bound Cinematic Sanctuary

Slow Light is a heavily fortified, Zero-Knowledge web sanctuary engineered exclusively for two individuals. Built on the principles of **Progressive Device-Bound Session Credentials (DBSC)**, **WebCrypto End-to-End Encryption (E2EE)**, and **Deterministic WebGL Rendering**, it represents a masterclass in secure systems design, applied cryptography, and resilient distributed architecture.

Designed under strict "MAANG-level" engineering tenets, this project employs aggressive fail-closed security mechanisms, PostgreSQL Row-Level Security (RLS), and a strictly decoupled front-end architecture that isolates DOM state from GPU render loops.

---

## 🏗️ System Architecture & Data Flow

Slow Light operates as a tightly integrated monorepo encompassing a static SPA, a Fastify-driven API, a background media processing pipeline, and infrastructure-as-code (IaC).

### Overarching Cloud Architecture

```text
                                 [ Client Device ]
                                 (Passkey / DBSC)
                                        |
                            +-----------+-----------+
                            |                       |
                    [ CloudFront CDN ]        [ AWS WAF / ALB ]
                            |                       |
                    +-------+-------+               |
                    |               |               |
               [ S3 SPA ]      [ S3 Media ]    [ Fastify API ] (ECS Fargate)
             (Static Vite)   (Signed URLs)          |
                                                    +--- [ RDS PostgreSQL ] (RLS Enforced)
                                                    |
                                                    +--- [ AWS KMS ] (Envelope Cryptography)
                                                    |
                                                    +--- [ Media Worker ] (ECS Fargate)
                                                         (ClamAV, sharp, FFmpeg)
```

### Component Breakdown & Interconnectivity

1. **The Client (Vite + React 19 + Three.js)**: 
   The frontend is a strictly sandboxed React application. State transitions are governed by mathematically verifiable **XState** finite state machines (preventing impossible UI states). The 3D Engine (`Vanilla Three.js`) is completely decoupled from React—they communicate exclusively via a typed pub/sub event bus. This prevents React's reconciliation cycle from causing garbage-collection (GC) stutters in the 60fps WebGL render loop.
2. **The API Gateway (Fastify 5)**:
   A high-throughput API layer enforcing strict input validation via `Zod`. It is entirely stateless, utilizing encrypted secure cookies anchored to hardware-bound session identifiers (DBSC).
3. **The Storage Layer (PostgreSQL + RLS)**:
   The database utilizes `FORCE ROW LEVEL SECURITY` tied to Fastify's transaction-local variables (`SET LOCAL app.user_id`). Even if a SQL injection vulnerability were introduced, the database driver physically rejects queries outside the authenticated user's scope.
4. **The Cryptographic Engine (KMS + E2EE)**:
   Textual memories are secured using **AES-256-GCM** envelope encryption (via AWS KMS) for data-at-rest. For absolute privacy, Phase 12 introduced a **True E2EE WebCrypto Vault**, leveraging **ECDH P-256** key agreement and **HKDF-SHA256** for zero-knowledge client-side decryption.

---

## 🌳 Detailed Repository Structure

The monorepo is managed via `pnpm` workspaces, establishing strict boundaries validated by `dependency-cruiser` in CI/CD.

```text
slow-light/
├── apps/
│   ├── api/                     # Backend Microservice (Fastify, Drizzle, KMS)
│   │   ├── src/auth/            # DBSC Engine, Passkey Registration, Session Mgmt
│   │   ├── src/crypto/          # AES-256-GCM Envelope Encryption & Keyring
│   │   ├── src/db/              # Drizzle Schema with RLS FORCE definitions
│   │   └── src/routes/          # Zod-validated API endpoints
│   ├── web/                     # Frontend SPA (React, XState, Three.js)
│   │   ├── src/app/             # XState Machine defining the 15-state UI flow
│   │   ├── src/lib/             # Client-side WebCrypto (E2EE Vault, DBSC vault)
│   │   ├── src/three/           # Deterministic WebGL Engine (Zero React coupling)
│   │   └── src/components/      # CSS Modules + React DOM layer
│   └── worker/                  # Asynchronous Media Pipeline
│       └── src/                 # FFmpeg HLS chunking, sharp image pyramids
├── packages/
│   ├── shared/                  # Agnostic Logic Layer
│   │   ├── schemas/             # JSON/Zod Validation Schemas
│   │   └── src/                 # Equirectangular Map Projection, PRNGs, E2EE
│   └── tokens/                  # Design System
│       └── tokens.json          # Single Source of Truth for CSS/JS aesthetics
├── infra/                       # Infrastructure as Code
│   ├── waf.tf                   # Admin-Door IP Allowlisting & Rate Limiting
│   └── s3.tf                    # Strictly Private Buckets (Block Public Access)
├── db/                          # Database Migrations
└── docs/                        # Specifications and Architectural Decisions
```

---

## 🛡️ Engineering Challenges & Architectural Decisions (ADRs)

Building a highly secure, cinematic application required navigating severe trade-offs between performance, security, and bundle size.

### 1. DBSC (Device-Bound Session Credentials) vs Bearer Tokens
**Challenge:** Standard session cookies are vulnerable to exfiltration (malware stealing the `__Host-sl_sid` cookie).
**Decision (ADR-014):** Implemented a progressive DBSC engine. Upon login, the client generates a non-extractable WebCrypto ECDSA P-256 keypair, storing the private key in IndexedDB. Every subsequent API request requires an **IEEE P1363 (Raw)** signature over a server-generated 32-byte challenge. Stolen cookies are useless without the hardware-bound private key.

### 2. Vanilla Three.js vs React Three Fiber (R3F)
**Challenge:** R3F provides excellent developer ergonomics but tightly couples the React render cycle to the GPU loop, leading to uncontrollable garbage collection spikes on mobile devices.
**Decision (ADR-002):** Chose Vanilla Three.js. Wrote a custom `ResourceTracker` to explicitly allocate and dispose of GPU geometries/textures. The engine layout is fully deterministic (using `mulberry32` PRNG), ensuring 60fps performance even on lower-tier mobile hardware.

### 3. Server-Side Rendering (Next.js) vs Static SPA (Vite)
**Challenge:** Next.js offers superior SEO and initial load times, but introduces a massive server-side attack surface (e.g., RSC vulnerabilities).
**Decision (ADR-001):** As a private application, SEO is irrelevant. Opted for a Vite SPA hosted on a static S3 bucket. This eliminates an entire class of server-side vulnerabilities and drastically reduces compute costs.

### 4. Zero-Knowledge E2EE vs Envelope Encryption
**Challenge:** The Author wanted absolute privacy, meaning even a database administrator (themselves) cannot read the Recipient's letters.
**Decision (ADR-015):** Phased approach. Base architecture uses KMS envelope encryption (AES-256-GCM). Phase 12 introduced a **WebCrypto E2EE Vault**. Participants exchange public JWKs (`ECDH-P256`), negotiate a shared secret via `HKDF`, and wrap row-bound AES keys via `AES-KW`. The backend serves purely as a blind storage array.

### 5. Media Pipeline & HLS Adaptive Streaming
**Challenge:** Serving massive 4K videos directly to mobile devices causes buffering and massive AWS egress costs.
**Decision (ADR-016 & ADR-007):** Uploaded media goes to a Quarantine bucket. A worker sanitizes (ClamAV) and generates a multi-bitrate HLS ladder (1080p to 360p). Media is delivered via CloudFront using **RSA-SHA1 Signed URLs** with a strict 900-second TTL.

---

## 📚 Documentation Index

Slow Light is meticulously documented. The `docs/` folder is the ultimate source of truth, dictating behavior, styling, and security guardrails.

| Document / Specification | Description |
| :--- | :--- |
| [`PRD.md`](./docs/PRD.md) | **Product Requirements Document**: The overarching vision, MVP scope, and non-negotiable constraints. |
| [`architecture.md`](./docs/architecture.md) | **System Architecture**: Detailed breakdown of the SPA, API, Worker, and DB interaction models. |
| [`rules.md`](./rules.md) | **Engineering Guardrails**: Mandatory coding standards (No TODOs, No 3rd parties, strict CSP). |
| [`docs/spec/00-front.md`](./docs/spec/00-front.md) | **Master Specification Index**: Entry point to the 36 meticulously detailed spec documents. |
| [`docs/spec/20-configuration.md`](./docs/spec/20-configuration.md) | **Environment Configuration**: Schemas for `.env` and `site.config.json` defining deployment boundaries. |
| [`docs/spec/21-json-schemas.md`](./docs/spec/21-json-schemas.md) | **Data Contracts**: Strict JSON Schema 2020-12 definitions for all payloads traversing the system. |
| [`docs/spec/25-implementation-roadmap.md`](./docs/spec/25-implementation-roadmap.md) | **Phased Execution**: The 13-phase roadmap dictating the build order and acceptance criteria. |
| [`docs/spec/27-security-test-matrix.md`](./docs/spec/27-security-test-matrix.md) | **Threat Model**: A 55-row matrix of adversarial scenarios and required mitigations. |
| [`docs/PROJECT-STATE.md`](./docs/PROJECT-STATE.md) | **State & Health**: Real-time tracker of phase completions, test coverage, and active ADR implementations. |
| [`memory.md`](./memory.md) | **Project Ledger**: A chronological log of decisions, audit results, and session histories. |

---
*Developed under strict security protocols with 100% test coverage and zero dependency boundary violations.*
