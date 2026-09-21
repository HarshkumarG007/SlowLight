# ADR-001: Vite + React 19 SPA over Next.js / Server Components

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-01), Spec 08 §8.2

## Context & Problem Statement
Slow Light is an entirely private sanctuary built for exactly two individuals (Author and Recipient). There are zero public pages, zero SEO requirements, and zero public landing pages. All content requires authentication. Choosing an application framework determines the server attack surface, complexity of the security boundary, and deployment model.

Frameworks like Next.js (App Router / React Server Components) blend server and client execution. Recent vulnerability history (e.g., Next.js middleware authorization bypass CVE-2025-29927, and React Server Components remote code execution CVE-2025-55182) illustrates that framework abstractions and magic routing significantly increase the server-side attack surface.

## Decision
We choose a **Vite + React 19 Single Page Application (SPA)** statically hosted on S3 and distributed via CloudFront, paired with an independent, dedicated **Fastify API** backend.

Next.js, Remix/React Router, SvelteKit, and Astro are rejected.

## Rationale
1. **Attack Surface Minimization**: The web frontend is purely static HTML/JS/CSS assets. There is no server-side JavaScript execution in the frontend delivery pipeline.
2. **Clear Boundary**: The browser communicates with the API only through explicit HTTP requests (`/api/v1/*`), making authentication and authorization boundaries transparent and auditable.
3. **No SSR/SEO Need**: Since the entire application is private and behind the Veil/passkey authentication, SSR and streaming hydration provide no user benefit while introducing substantial complexity.
4. **Independent Auditing**: The Fastify API can be audited and rate-limited without framework-specific middleware bypass vulnerabilities.

## Consequences
- **Positive**: Eliminates framework SSR attack vectors; static frontend can be deployed to immutable object storage behind CloudFront with strict CSP; low hosting cost.
- **Negative / Trade-off**: No server-side HTML pre-rendering; initial bundle must load before rendering (mitigated by keeping the Veil bundle ≤ 120 KB gzipped).
