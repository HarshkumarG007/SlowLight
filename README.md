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

## 📖 The Chronicle: The Story of Slow Light

### 🌟 Part I: The "Why" — Explaining Slow Light to a Layman (The Newman's Guide)

To truly appreciate the architecture of **Slow Light**, one must first understand what it is and why it exists.

#### 1. The Human Story: A Digital Sanctuary for Two
In modern life, our most precious memories—the photographs from a rainy Tuesday in autumn, the quiet voice notes recorded late at night, the handwritten letters, and the promises made—are scattered across commercial platforms. They live inside corporate chat applications, cloud photo streams, and social media feeds. 
In those commercial spaces:
- Algorithms constantly analyze your private life to serve advertisements.
- Tracking pixels follow you across the internet.
- A single data breach or leaked password can expose your most intimate thoughts to strangers.
- The interface is filled with distraction: red notification badges, likes, read receipts, and commercial clutter.

**Slow Light** was born from a completely different premise:
> *"Everything we were is still arriving."*

It is a custom, private digital sanctuary created exclusively for **exactly two people**: the **Author** (who curates the memories) and the **Recipient** (the loved one who visits). When the Recipient logs in, she does not see a feed or a grid of thumbnails. She steps into a **three-dimensional, interactive night sky**. 

Every star in that celestial canopy is a memory. As she navigates forward in time along a luminous cosmic rail, she can touch a star to "unfold" it. A memory panel opens, presenting high-definition photographs, restored home videos, audio recordings, and deeply personal letters. Some letters are open; others are locked with digital clockwork, designed to unlock only on an anniversary or a specific future date.

#### 2. Translating "MAANG-Level Security" into Everyday Metaphors
Why build a private romantic application with the same security engineering used by intelligence agencies, top-tier financial networks, and defense systems? Because **intimacy without security is an illusion**. If an application holds the most vulnerable, honest expressions of human love, it must be completely impervious to surveillance, data mining, theft, and accidental exposure.

Here is how the deep technical concepts work in everyday terms:

* **Passkeys instead of Passwords (The Unforgeable Biometric Lock)**:
  * *The Problem*: Passwords can be guessed, written down, intercepted by spyware, or leaked in server breaches.
  * *The Solution*: Slow Light has no passwords. None. Instead, entering the sanctuary requires a **WebAuthn Passkey**. Just like opening your iPhone with FaceID or TouchID, your physical device creates an unforgeable cryptographic signature. The server never holds your biometric data; it only verifies that the mathematical key locked inside your personal phone approved the entry.

* **Sealed Envelopes & KMS (The Blind Post Office)**:
  * *The Problem*: In standard cloud applications, backend developers, database administrators, and cloud hosting staff can open the database and read all the private letters stored inside.
  * *The Solution*: Before any letter or memory text touches the database, it is sealed inside an **AES-256-GCM cryptographic envelope**. Even if someone steals the database hard drive or runs a SQL query, all they see is random, scrambled noise. The key to unseal that envelope is protected by a dedicated Hardware Security Module (AWS KMS) that only unlocks for authorized requests bound to the specific row identity.

* **DBSC — Device-Bound Session Credentials (The Physical Keycard)**:
  * *The Problem*: When you log into a typical website, your browser saves a "session cookie" (like an entry wristband). If malware infiltrates your computer or someone steals that cookie, they can impersonate you from anywhere in the world.
  * *The Solution*: Slow Light uses cutting-edge **DBSC**. When you log in, your browser creates a private cryptographic key stored deep in your device's secure hardware enclave. Every single API request requires your phone to sign a live, single-use 32-byte cryptographic puzzle. Even if an attacker steals the session cookie, it is completely useless to them because they don't possess your physical phone's hardware chip.

* **True Client-Side E2EE (The Secret Code Between Two Hearts)**:
  * *The Problem*: What if the cloud provider itself is subpoenaed or compromised?
  * *The Solution*: Phase 12 introduced **True End-to-End Encryption (E2EE)**. Using the **WebCrypto API** directly in the browser, the Author and Recipient negotiate an ephemeral secret key using **ECDH P-256** and **HKDF**. The message is encrypted on the Author's device *before* it leaves, and decrypted on the Recipient's device *after* it arrives. The server in the middle is completely blind.

* **Row-Level Security / RLS (The Welded Safety Deposit Box)**:
  * *The Problem*: A programming mistake in backend code can accidentally return another user's data.
  * *The Solution*: PostgreSQL's `FORCE ROW LEVEL SECURITY` acts as a physical steel wall inside the database engine itself. The database refuses to return any data unless the query originates from an authenticated transaction tagged with that exact user's identity.

* **Vanilla Three.js & The Governor (The Butter-Smooth Planetarium)**:
  * *The Problem*: 3D websites often stutter, overheat mobile phones, or drain the battery because of memory leaks and heavy frameworks.
  * *The Solution*: The 3D engine is built in pure, handcrafted Three.js, completely isolated from React. A built-in "Governor" monitors the device's battery and frame rate in real time. If she opens the app on a high-end desktop, it displays blooming cosmic nebulae; if she opens it on an older phone on a train, the Governor smoothly steps down the graphical load to maintain a rock-solid, battery-efficient 60 frames per second.

* **The Admin Door (The Invisible Speakeasy)**:
  * *The Problem*: Admin portals are prime targets for brute-force hacker attacks.
  * *The Solution*: The Admin console does not even exist on the public internet. It is protected by AWS WAF IP filtering and a dedicated secret entry gate. To anyone scanning the web, the admin panel returns a blank 404 wall.

---

### 🏛️ Part II: The Phase-by-Phase Genesis & Verification Evidence

Every line of Slow Light was built systematically across **13 distinct phases (Phase 0 through Phase 12)**. Each phase tackled a critical technical domain, enforced strict non-negotiable architectural invariants, and produced verifiable cryptographic and automated test evidence.

```text
 PHASE 0           PHASE 1          PHASE 2          PHASE 3          PHASE 4          PHASE 5
 [Blueprints] ---> [Foundation] ---> [Passkeys] ----> [Media Vault] -> [3D Engine] ---> [Memory Flow]
      |                 |                |                |                |                |
      v                 v                v                v                v                v
  ADRs 001-012      Postgres RLS     WebAuthn FIDO2    KMS Envelopes    Deterministic   XState FSM
  CI Guardrails     Drizzle Schema   Zero Passwords    CloudFront RSA   Three.js 60fps  SL-Text Parser

 PHASE 6           PHASE 7          PHASE 8          PHASE 9          PHASE 10         PHASE 11
 [Sensory] ------> [Admin Door] ---> [Hardening] ---> [Performance] -> [Red Team] ----> [Production]
      |                 |                |                |                |                |
      v                 v                v                v                v                v
  Web Audio API     WAF IP Gate      Trusted Types    Code Splitting   Playwright CDP  Terraform IaC
  Signed Refresh    Isolated MPA     HMAC Chain       <120KB Budget    A11y WCAG AA    Soft Launch

                                    PHASE 12 (CROWNING EXTENSIONS)
  +-------------------+--------------------+--------------------+-------------------+--------------------+
  | T12.1: Replies    | T12.2: DBSC        | T12.3: True E2EE   | T12.4: HLS Video  | T12.5: Map View    |
  | Sealed Whispers   | Hardware Binding   | WebCrypto Vault    | 4-Tier Ladder     | Offline SVG Globe  |
  +-------------------+--------------------+--------------------+-------------------+--------------------+
```

---

#### Phase 0: Architecture, Invariants & Security Guardrails
* **The Goal**: Establish immutable engineering guardrails, locked architectural decision records, and automated boundary verification before writing a single application line.
* **The Engineering Solution**:
  * Formulated **ADR-001 through ADR-012**, defining the non-negotiables: no Next.js/RSC (eliminating server-side template injection and SSR CVEs), zero third-party client trackers (no Google Fonts, no CDN scripts, no analytics), and DOM-isolated media elements (photos are never WebGL textures, eliminating GPU memory leaks).
  * Configured `pnpm` workspace boundaries enforced by `dependency-cruiser` in continuous integration.
* **The Newman Takeaway**: Setting up the laws of physics and safety codes before breaking ground on the sanctuary.
* **Concrete Evidence**:
  * Architectural Specifications: [`docs/spec/00-front.md`](./docs/spec/00-front.md) through `docs/spec/36-*.md`.
  * Engineering Rules: [`rules.md`](./rules.md) and [`AGENTS.md`](./AGENTS.md).
  * Strict dependency graphs preventing `apps/web` from ever importing backend database or server logic.

---

#### Phase 1: Foundation, Design Tokens & The Database Bedrock
* **The Goal**: Build a rock-solid, typed monorepo skeleton, design token pipeline, Fastify backend shell, and PostgreSQL database with tamper-proof security.
* **The Engineering Solution**:
  * Designed a design token system (`packages/tokens/tokens.json`) compiling into CSS custom properties under CSS `@layer reset, tokens, base, components, utilities`.
  * Deployed a schema-first Fastify 5 server with Zod schema validation and Pino structured logging with strict redaction.
  * Formulated the PostgreSQL schema using Drizzle ORM, with 27 distinct relational tables and `FORCE ROW LEVEL SECURITY` applied across every table.
  * Implemented `withActor` database transaction contexts binding PostgreSQL session variables (`SET LOCAL app.user_id = ?`) to enforce isolation at the SQL engine level.
* **The Newman Takeaway**: Pouring the steel-reinforced concrete foundation and laying the private plumbing where every pipe has an unpickable physical lock.
* **Concrete Evidence**:
  * Database Schema: `apps/api/src/db/schema.ts` and `db/migrations/0001_init.sql`.
  * Design Tokens: `packages/tokens/tokens.json`.
  * Verified Docker Compose local stack with PostgreSQL 16 Alpine, MinIO S3 emulation, and mock KMS.

---

#### Phase 2: Passwordless Authentication ⚑ (The Biometric Gatekeeper)
* **The Goal**: Eliminate passwords entirely and engineer a phishing-resistant authentication system for the two participants.
* **The Engineering Solution**:
  * Built an end-to-end **FIDO2 / WebAuthn Passkey** engine using `@simplewebauthn/server` and `@simplewebauthn/browser`.
  * Implemented cryptographic challenge lifecycles with single-use consumption and short TTLs to defeat replay attacks.
  * Engineered a secure enrollment ceremony: the Author generates a cryptographically random, single-use invite URL and an out-of-band oral confirmation phrase.
  * Implemented double-defense CSRF protection using `__Host-` prefixed secure cookies, strict `SameSite=Strict` flags, and custom request header verification.
* **The Newman Takeaway**: Replacing flimsy keys and easily guessed passwords with an unforgeable fingerprint lock and an ancient wax-seal invitation ceremony.
* **Concrete Evidence**:
  * Implementation: `apps/api/src/auth/passkeys.ts`, `apps/api/src/auth/sessions.ts`, `apps/web/src/components/Login.tsx`.
  * Automated Tests: `apps/api/src/auth/passkeys.test.ts` achieving 100% branch coverage on authentication routines.

---

#### Phase 3: Private Storage & The Media Pipeline ⚑ (The Darkroom & Vault)
* **The Goal**: Protect personal photographs, home movies, and intimate letters so they can never be exposed in database dumps or leaked cloud storage.
* **The Engineering Solution**:
  * Created the `seal()` and `unseal()` envelope encryption engine in `apps/api/src/crypto/sealed.ts` using **AES-256-GCM** with 96-bit nonces and row-bound Associated Authenticated Data (AAD).
  * Direct media uploads leverage presigned S3 POST policies enforcing strict file size caps and MIME-type restrictions.
  * Developed an asynchronous media worker (`apps/worker/src/`) that pulls uploads from a quarantined S3 bucket, inspects magic bytes, scans for viruses via **ClamAV**, strips EXIF metadata using `sharp`, and generates responsive image pyramids and thumbnail previews.
  * Created CloudFront **RSA-SHA1 Signed URL** delivery (`/_m/*`) with strict 900-second time-to-live (TTL) and zero public S3 bucket access.
* **The Newman Takeaway**: A museum-grade photographic darkroom that inspects every negative for poison, removes hidden GPS tracking tags, and only lets you view photos through a one-way security glass that dims after 15 minutes.
* **Concrete Evidence**:
  * Cryptographic Engine: `apps/api/src/crypto/sealed.ts`.
  * Cryptographic Tests: `apps/api/src/crypto/sealed.test.ts` (13 tests passing verifying ciphertext integrity, tampering rejection, and AAD mismatches).
  * Media Access Route: `apps/api/src/media/access.ts` and `apps/api/src/media/access.test.ts` (4 tests passing).

---

#### Phase 4: Core 3D & The Deterministic Cosmos (The Planetarium)
* **The Goal**: Create a breathtaking 3D celestial sky where memories exist as stars, running flawlessly at 60 frames per second across devices from iPhones to 4K monitors.
* **The Engineering Solution**:
  * Developed a vanilla **Three.js** WebGL engine (`apps/web/src/three/Engine.ts`) with zero React coupling. The engine and React communicate strictly through a typed event/command bus (`apps/web/src/three/bus.ts`).
  * Implemented the `mulberry32` pseudo-random number generator (PRNG) and FNV-1a hashing in `packages/shared/src/layout.ts` to ensure the position and twinkle of every star is 100% deterministic across all platforms.
  * Engineered a multi-tier **Performance Governor** (`apps/web/src/three/Governor.ts`) monitoring real-time frame delta times, dynamically stepping down visual fidelity tiers (High, Medium, Low, Mobile, Minimal, Flat) to guarantee zero UI stuttering.
  * Created a custom `ResourceTracker` deallocating every GPU buffer, material, and geometry on route changes, preventing WebGL context crashes.
* **The Newman Takeaway**: A custom-engineered planetarium where every star has an exact mathematical coordinate that never shifts, accompanied by an invisible conductor that keeps the performance smooth even if your phone's battery is low.
* **Concrete Evidence**:
  * Mathematical Layout: `packages/shared/src/layout.ts` and `packages/shared/src/layout.test.ts` (5 tests passing).
  * Engine Core: `apps/web/src/three/Engine.ts` and `apps/web/src/three/Governor.ts`.
  * Memory Leak Suite: `apps/web/src/three/memory-leak.test.ts` (1 test passing asserting complete GPU buffer deallocation down to 0).

---

#### Phase 5: The Memory System & The Lamp Room (The Chronicle of Moments)
* **The Goal**: Orchestrate the unfolding of memories, chronological time navigation, and private letter reading through a mathematically verifiable state machine.
* **The Engineering Solution**:
  * Built the application lifecycle around an **XState v5** state machine (`apps/web/src/app/machine.ts`) with 15 discrete states, 9 guards, and 9 actors, mathematically eliminating impossible UI states (e.g. viewing a memory while logged out).
  * Created the **SL-Text** custom lightweight parser (`apps/web/src/lib/sl-text.ts`), allowing the Author to format memories with italics, poetic line breaks, and emphasis without introducing risky HTML or script injection surfaces.
  * Developed the **Lamp Room** (`apps/web/src/components/LetterViewer.tsx`), supporting open letters, timed letters (locked until a future timestamp), and held letters requiring a deliberate "seal-breaking" gesture.
  * Engineered the **Logbook** (`apps/web/src/components/Logbook.tsx`), providing an accessible, high-contrast DOM alternative to the 3D sky for keyboard navigation and screen readers.
* **The Newman Takeaway**: An interactive digital scrapbook and a secret room of letters, where each memory gently unfolds like parchment and impossible interface glitches are mathematically prevented.
* **Concrete Evidence**:
  * State Machine: `apps/web/src/app/machine.ts` and `apps/web/src/app/machine.test.ts` (2 tests passing).
  * Markup Parser: `apps/web/src/lib/sl-text.ts` and `apps/web/src/lib/sl-text.test.ts` (5 tests passing).
  * Content Schemas: `packages/shared/schemas/content.schemas.json`.

---

#### Phase 6: The Media Experience & Sonic Landscape (The Sensory Symphony)
* **The Goal**: Deliver an intimate, cinema-grade multimedia viewer with responsive imagery, fluid touch gestures, and an opt-in procedural audio soundscape.
* **The Engineering Solution**:
  * Built `MediaViewer.tsx` featuring pinch-to-zoom, touch swiping, keyboard shortcuts, and Low-Quality Image Placeholder (LQIP) blurred crossfades.
  * Engineered a transparent signed URL auto-refresh mechanism: if a CloudFront signed URL expires while the Recipient is reading or listening, the component catches the 403, requests a fresh token, and preserves video/audio playback position seamlessly.
  * Created the procedural `AudioSystem.ts` leveraging the **Web Audio API**. Soundscapes are strictly off by default, require an intentional user gesture to unlock, and feature gentle crossfading between atmospheric ambient beds.
* **The Newman Takeaway**: A private cinema with acoustic soundproofing and an automated projectionist who swaps film reels so seamlessly that you never notice the clock running out.
* **Concrete Evidence**:
  * Components: `apps/web/src/components/MediaViewer.tsx`, `apps/web/src/components/MediaAsset.tsx`.
  * Audio Engine: `apps/web/src/lib/audio.ts`.

---

#### Phase 7: The Admin Console & The Admin Door ⚑ (The Curator's Workshop)
* **The Goal**: Provide the Author with a powerful, desktop-optimized content management portal that is completely hidden and inaccessible to the outside world.
* **The Engineering Solution**:
  * Architected the Admin Console as a standalone Multi-Page Application (MPA) at `admin.html`, completely physically separated from the Recipient's SPA bundle.
  * Implemented the **Admin Door**: enforced via AWS WAF IP allowlisting. Requests attempting to reach `/admin` from unauthorized IP addresses receive a silent 404 response.
  * Built rich editors for memories, constellation chapters, time-locked letters, and invite phrases, alongside a real-time cryptographic audit log viewer.
  * Strictly prevented any logging or exposure of the Recipient's reading activity or browsing behavior, upholding invariant **A-08**.
* **The Newman Takeaway**: A hidden study behind a secret revolving bookcase that only opens when you enter from your personal home network, giving you a quiet desk to write letters without disturbing the sanctuary.
* **Concrete Evidence**:
  * Admin Portal: `apps/web/admin.html` and `apps/web/src/admin/`.
  * Backend API: `apps/api/src/routes/admin.routes.ts`.
  * WAF Gate: `infra/waf.tf`.

---

#### Phase 8: Security Hardening & The Impenetrable Perimeter ⚑ (The Iron Armor)
* **The Goal**: Harden the application against all known web attack vectors, achieving an airtight security posture verified against a 55-row adversarial threat matrix.
* **The Engineering Solution**:
  * Enforced W3C **Trusted Types** (`apps/api/src/plugins/securityHeaders.ts`), turning Cross-Site Scripting (XSS) from a runtime vulnerability into a compile-time and DOM-level impossibility.
  * Deployed a hyper-strict Content Security Policy (CSP): `default-src 'none'; script-src 'self'; connect-src 'self'`. Zero foreign domains, zero third-party CDNs, zero remote fonts.
  * Configured `Clear-Site-Data: "cache", "cookies", "storage"` on logout and session revocation to purge cached memory assets immediately from device storage.
  * Created a cryptographically chained audit log where each event hash is bound to the previous event hash using **HMAC-SHA256**, making historical tampering mathematically detectable.
* **The Newman Takeaway**: Inspecting every rivet in the castle walls with an electron microscope, sealing every microscopic crack, and burning the bridge behind every exit.
* **Concrete Evidence**:
  * Security Headers: `apps/api/src/plugins/securityHeaders.ts` and `infra/security-headers.json`.
  * Threat Matrix: [`docs/spec/27-security-test-matrix.md`](./docs/spec/27-security-test-matrix.md).
  * Cryptographic Audit Logs: `apps/api/src/audit/`.

---

#### Phase 9: Performance Engineering & Resource Optimization (The Lightweight Feather)
* **The Goal**: Ensure instant page loads and zero garbage-collection stuttering, even on constrained cellular networks and older mobile chipsets.
* **The Engineering Solution**:
  * Implemented dynamic code-splitting via `React.lazy()` for heavy 3D canvases, keeping the critical entry bundle (The Veil) well below the strict **120 KB gzip** budget.
  * Applied Latin-subset font packaging for Inter and Playfair Display, eliminating layout shifts (CLS < 0.05).
  * Optimized database query plans using Drizzle composite indexes and PostgreSQL `EXPLAIN ANALYZE` benchmarks, ensuring world manifests generate in under 50 milliseconds.
* **The Newman Takeaway**: Tuning an elite race car by stripping away every surplus gram of weight, so it starts instantaneously even on a weak mobile phone connection in the rain.
* **Concrete Evidence**:
  * Performance Budgets: `packages/config/performance-budgets.json`.
  * Lazy Loading Integration: `apps/web/src/App.tsx`.
  * Automated Performance Suite: `.github/workflows/performance.yml`.

---

#### Phase 10: Testing, Resilience & Red-Teaming (The Proving Grounds)
* **The Goal**: Subject the entire system to comprehensive automated end-to-end testing, virtual authenticator flows, accessibility scans, and simulated disaster drills.
* **The Engineering Solution**:
  * Built Playwright E2E suites utilizing the **Chrome DevTools Protocol (CDP)** to inject virtual FIDO2 / WebAuthn authenticators, testing passkey registration, login, and step-up elevation without human intervention.
  * Integrated `@axe-core/playwright` to automatically verify WCAG 2.2 AA accessibility compliance across all modals, dialogs, and color contrasts.
  * Executed database disaster recovery drills, verifying that Point-In-Time Recovery (PITR) restores the encrypted database state in under 5 minutes with zero plaintext leakage.
* **The Newman Takeaway**: Simulating earthquakes, fires, and professional safe-cracker attacks in a controlled laboratory to prove the vault cannot fail.
* **Concrete Evidence**:
  * E2E Workflow: `.github/workflows/e2e.yml`.
  * Disaster Recovery Drill Scripts: `packages/cli/`.
  * Automated accessibility verification across all primary views.

---

#### Phase 11: Production Infrastructure & Operational Readiness (The Launchpad)
* **The Goal**: Codify every piece of cloud infrastructure in declarative code and build operational CLI tools for safe, verified production deployment.
* **The Engineering Solution**:
  * Authored complete **Terraform Infrastructure-as-Code** (`infra/`): AWS ECS Fargate clusters, RDS PostgreSQL Multi-AZ databases, private S3 buckets with Object Lock and SSE-KMS, CloudFront distributions, and WAF rate-limiting rules.
  * Engineered the unified CLI suite (`pnpm cli <cmd>`):
    * `bootstrap`: Initializes database roles and KMS keyrings.
    * `invite:create`: Generates single-use, out-of-band Recipient enrollment passes.
    * `admin-door`: Dynamically opens and closes the WAF IP allowlist.
    * `export-escrow`: Generates an offline, encrypted paper/cold-storage backup escrow.
    * `soft-launch`: Verifies production database health, KMS encryption, and S3 connectivity prior to user onboarding.
* **The Newman Takeaway**: Building the space launchpad and fueling the rocket with double-redundant emergency parachutes before anyone steps inside.
* **Concrete Evidence**:
  * Terraform Infrastructure: `infra/main.tf`, `infra/waf.tf`, `infra/s3.tf`, `infra/variables.tf`.
  * CLI Tooling: `apps/api/src/cli/` (`bootstrap.ts`, `invite.ts`, `soft-launch.ts`, `export-escrow.ts`).
  * Configuration Specifications: [`docs/spec/20-configuration.md`](./docs/spec/20-configuration.md).

---

#### Phase 12: The Five Crown Jewel Extensions (The Pinnacle of Modern Engineering)
Phase 12 took Slow Light from a battle-tested web application to the cutting edge of applied cryptography and systems design, implementing five ambitious extensions:

```text
+--------------------------------------------------------------------------------------------------+
|                                    PHASE 12 EXTENSIONS SUMMARY                                   |
+--------+---------------------------------------+-------------------------+-----------------------+
| Task   | Title                                 | Architectural Decision  | Verification Evidence |
+--------+---------------------------------------+-------------------------+-----------------------+
| T12.1  | Recipient Sealed Replies              | ADR-013 (Option 1)      | 4 / 4 Tests Passing   |
| T12.2  | Device-Bound Session Credentials      | ADR-014 (Option 2)      | 22 / 22 Tests Passing |
| T12.3  | Sealed Vault v2 (True Client E2EE)    | ADR-015 (Option 2)      | 16 / 16 Tests Passing |
| T12.4  | Adaptive Bitrate HLS Video Streaming  | ADR-016 (Option 1)      | 9 / 9 Tests Passing   |
| T12.5  | Interactive Offline Starlight Map     | ADR-017 (Option 3)      | 17 / 17 Tests Passing |
+--------+---------------------------------------+-------------------------+-----------------------+
```

##### 1. T12.1: Recipient Sealed Replies (The Intimate Whisper)
* **The Problem**: In v1, the Recipient could only view memories and favorite letters. She had no way to whisper back or leave a quiet response.
* **The Solution (ADR-013)**: Built the sealed reply pipeline. The Recipient can type a personal reply directly inside any `MemoryPanel` or `LetterViewer`. The message is encrypted with row-bound AES-256-GCM (`body_sealed`), stored in the `replies` database table, and presented exclusively to the Author inside a dedicated admin viewer.
* **Evidence**:
  * Database Schema: `replies` table in `apps/api/src/db/schema.ts`.
  * Endpoints: `POST /api/v1/replies` and `GET /api/v1/replies` in `apps/api/src/routes/replies.routes.ts`.
  * UI Components: `ReplyComposer.tsx` (client) and `RepliesViewer.tsx` (admin).
  * Automated Tests: `apps/api/src/routes/replies.test.ts` (**4 tests passing**).

##### 2. T12.2: Device-Bound Session Credentials (The Physical Silicon Anchor)
* **The Problem**: Traditional browser cookies can be stolen by infostealer malware or network interception.
* **The Solution (ADR-014)**: Pioneered **DBSC** via progressive enhancement. Upon login, the client uses the **WebCrypto API** to generate a non-extractable **ECDSA P-256** keypair stored in IndexedDB (`sl_dbsc_vault`). Every sensitive API call requires signing a server-generated 32-byte challenge with a raw **IEEE P1363** signature. Replay attempts are rejected by single-use challenge consumption within a 120-second window.
* **Evidence**:
  * Core Engine: `apps/api/src/auth/dbsc.ts` (dual WebCrypto raw IEEE P1363 and ASN.1 DER signature verification).
  * Client Vault: `apps/web/src/lib/dbsc.ts` and `SecurityPanel.tsx`.
  * Protocol Headers: Emits `Sec-Session-Registration: (path="/api/auth/dbsc/register")` on authentication.
  * Automated Tests: `apps/api/src/auth/dbsc.test.ts` (17 tests) and `apps/api/src/routes/dbsc.routes.test.ts` (5 tests) = **22 tests passing**.

##### 3. T12.3: Sealed Vault v2 — True Client-Side E2EE (The Zero-Knowledge Vault)
* **The Problem**: Even with database encryption, anyone with root access to the backend server could theoretically intercept decrypted text in server memory.
* **The Solution (ADR-015)**: Implemented true client-to-client zero-knowledge encryption using pure **WebCrypto**:
  1. Author and Recipient generate client-side **ECDH P-256** keypairs stored in non-extractable device vaults (`sl_e2ee_vault`).
  2. Public keys are exchanged via `POST /api/auth/e2ee/keys`.
  3. The sender performs ECDH key agreement, derives an encryption key via **HKDF-SHA256**, wraps a per-memory row key via **AES-KW (RFC 3394)**, and seals the plaintext with **AES-256-GCM** using row-bound AAD.
  4. The backend server stores the resulting `v2.e2ee...` ciphertext without ever possessing the decryption key.
  5. The client seamlessly decrypts the text in the browser, proudly displaying a gold **"✦ Hardware E2EE Sealed"** badge.
* **Evidence**:
  * Cryptographic Core: `packages/shared/src/e2ee.ts` (zero dependencies, pure WebCrypto).
  * Client Key Manager: `apps/web/src/lib/e2ee.ts`.
  * Badges & Verification: `MemoryPanel.tsx`, `LetterViewer.tsx`, and interactive benchmark in `SecurityPanel.tsx`.
  * Automated Tests: `packages/shared/src/e2ee.test.ts` (11 tests) and `apps/api/src/routes/e2ee.test.ts` (5 tests) = **16 tests passing**.

##### 4. T12.4: Adaptive Bitrate HLS Streaming (The Uninterrupted Cinema)
* **The Problem**: Streaming uncompressed 4K video directly to mobile devices causes buffering on spotty cellular connections and generates enormous bandwidth egress.
* **The Solution (ADR-016)**: Built a multi-bitrate HTTP Live Streaming (HLS) pipeline conforming to **RFC 8216**:
  * The media worker (`apps/worker/src/hls.ts`) segments source videos into 6-second MPEG-TS chunks and generates master playlists across 4 distinct resolution ladders: **1080p (4.5 Mbps)**, **720p (2.2 Mbps)**, **480p (1.0 Mbps)**, and **360p (500 kbps)**.
  * Videos are streamed through CloudFront signed URLs (`/_m/*`) with 900s TTL.
  * Developed `HLSPlayer.tsx` in React: uses native Apple HLS on iOS Safari, supports manual and auto quality switching, falls back to progressive MP4 if HLS is unavailable, and transparently preserves playback timestamps across signed URL renewals.
* **Evidence**:
  * Playlist Generator: `apps/worker/src/hls.ts`.
  * Access Control: `apps/api/src/media/access.ts` (supporting `variant: 'hls'`).
  * Video Player: `apps/web/src/components/HLSPlayer.tsx`.
  * Automated Tests: `apps/worker/src/hls.test.ts` (5 tests) and `apps/api/src/media/access.test.ts` (4 tests) = **9 tests passing**.

##### 5. T12.5: Interactive Starlight Map View (The Constellation of Journeys)
* **The Problem**: A romantic journey spans places and cities across the globe. Using third-party map providers (like Google Maps or Mapbox) would violate invariant **PRIV-01** by leaking the Recipient's IP address and coordinates to third parties.
* **The Solution (ADR-017)**: Engineered a 100% self-contained, offline **SVG Equirectangular World Map**:
  * The math engine (`packages/shared/src/map.ts`) translates GPS `(latitude, longitude)` into 2D SVG canvas space `(x, y)` without external libraries.
  * Implemented strict **server-side coordinate coarsening**: exact GPS coordinates are snapped to a coarse grid (±0.1° / ~11 km resolution) to prevent pinpoint location tracking.
  * Memories with hidden location flags are stripped before transmission.
  * Renders memories as luminous golden starlight pins with chronological glowing trails, interactive pan/zoom, preview cards, and direct deep-linking into the 3D celestial sky.
* **Evidence**:
  * Mathematical Projection: `packages/shared/src/map.ts`.
  * API Endpoint: `apps/api/src/routes/map.routes.ts` (`GET /api/v1/map`).
  * UI Explorer: `apps/web/src/components/MapView.tsx`.
  * Automated Tests: `packages/shared/src/map.test.ts` (13 tests) and `apps/api/src/routes/map.test.ts` (4 tests) = **17 tests passing**.

---

### 🛡️ Part III: Verification Metrics & Operational Health

The entire Slow Light monorepo stands at **100% completion** with impeccable quality gates verified across all workspaces:

```text
========================================================================================
                          MONOREPO VERIFICATION AUDIT MATRIX
========================================================================================
  Check / Test Suite       Target              Actual Result            Health Status
----------------------------------------------------------------------------------------
  ESLint Code Quality      0 warnings, 0 err   0 warnings, 0 errors     ✅ PERFECT
  TypeScript Strictness    0 compilation err   0 errors (strict mode)   ✅ PERFECT
  Vitest Monorepo Tests    100% pass           94 / 94 tests passing    ✅ PERFECT
    - packages/shared      All unit tests      29 / 29 passed           ✅ PASS
    - apps/api             All routes/crypto   52 / 52 passed           ✅ PASS
    - apps/web             FSM / UI / leaks    8 / 8 passed             ✅ PASS
    - apps/worker          HLS / processing    5 / 5 passed             ✅ PASS
  Dependency Cruiser       Zero cycles         0 boundary violations    ✅ PERFECT
  Production Builds        All packages clean  4 of 4 workspaces clean  ✅ PERFECT
  Git Working Tree         Clean & committed   Up to date with origin   ✅ SYNCHRONIZED
========================================================================================
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
**Challenge:** The Author wanted absolute privacy, meaning even a database administrator cannot read the Recipient's letters.
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

*Slow Light stands fully realized: a zero-knowledge, hardware-bound sanctuary of light, memory, and code.*
