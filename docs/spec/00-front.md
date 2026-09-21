# SLOW LIGHT — Master Specification & Engineering Blueprint

**Version 1.0 · 2026-09-20 · Status: implementation-ready. Assumptions are flagged in §A.**
Codename `slow-light`. User-facing name is configuration (`site.name`), never hard-coded.

> A private digital sanctuary built around one relationship: an interactive cinematic love letter, a private memory museum, and an encrypted digital sanctuary. Technology disappears behind the emotion.

## How to use this document

| Reader | Read first | Then |
|---|---|---|
| Designer | 02, 03, 05, 22 | 04, 07, 34 |
| Frontend / 3D engineer | 04, 05, 06, 07, 18 | 22, 21, 28 |
| Backend engineer | 09, 13, 15, 16, 17 | 10, 14, 21 |
| Security engineer | 10, 11, 32 | 16, 17, 27, 33 |
| DevOps | 29, 30, 31 | 09, 10, 20 |
| Antigravity (coding agent) | 23, 24, then 25 phase by phase | every doc a phase references |
| The Author (you) | §A assumptions, 02, 20, 31 | 34 |

Blocks tagged `<!-- extract: path -->` are machine-extractable into repo files (see the bundle zip). JSON, SQL and TypeScript in them were validated when this spec was produced.

## Locked decisions (details and alternatives in Doc 08)

| ID | Decision | One-line reason |
|---|---|---|
| D-01 | Vite + React SPA (static) + Fastify API; no Next.js/RSC | Smallest server attack surface; 2025 Next.js middleware-bypass and RSC RCE advisories show the cost of framework magic |
| D-02 | Vanilla Three.js engine, not React Three Fiber | Explicit resource ownership, testable, 3D state separate from React |
| D-03 | Photos/videos live in the DOM, never in WebGL textures | Halves GPU memory, removes taint issues, keeps content accessible |
| D-04 | Recipient auth is passkey-only (WebAuthn, UV required); recovery is Author-mediated | No password database, phishing-resistant, low friction |
| D-05 | Server-side authorization + Postgres Row-Level Security (defense in depth) | A coding bug must not leak drafts or sealed letters |
| D-06 | Sealed fields: AES-256-GCM envelope encryption, KMS-wrapped keys, for stories/letters/captions/locations | Protects DB dumps and backups; honest about app-compromise limits |
| D-07 | Media: private S3 + SSE-KMS, same-origin CloudFront signed URLs (`/_m/*`), no CDN caching | No bearer URLs on foreign origins; edge validates signature |
| D-08 | Originals never served by the web app (CLI break-glass only) | API compromise cannot exfiltrate GPS-bearing originals |
| D-09 | AWS reference deployment: CloudFront+WAF → internal ALB → ECS Fargate → RDS PostgreSQL | One control plane, KMS/CloudTrail audit, Object Lock backups |
| D-10 | Admin reachable only through the "Admin Door" (WAF IP allow-list) + passkey + step-up | Admin is unreachable from the internet by default |
| D-11 | Zero analytics, zero third-party requests, self-hosted fonts | Privacy first |
| D-12 | No end-to-end encryption in v1; upgrade path specified (Doc 10 §10.9) | Complexity/recovery cost outweighs benefit at this threat level |

## §A Assumptions register (safest default; change deliberately)

| ID | Assumption | If wrong |
|---|---|---|
| A-01 | Exactly two humans: one **Author** (admin) and one **Recipient** (viewer) | Multi-recipient needs Doc 17 changes and per-recipient visibility |
| A-02 | Scale ≤ 2,000 memories, ≤ 200 letters, ≤ 20,000 assets, ≤ 200 GB | Search and layout need revisiting above this |
| A-03 | Content language is Latin-script English | Add self-hosted Noto subsets and `lang` attributes |
| A-04 | AWS, one primary region + one backup region, separate backup account | Provider mapping in Doc 29 §29.12 |
| A-05 | Author owns a neutral domain (no romantic words) with WHOIS privacy | Choose one before Phase 11 |
| A-06 | Recipient has a device with passkey support | Author issues a fresh enrollment; hybrid (QR) login for other computers |
| A-07 | Author or Antigravity can run CLI scripts (invites, Admin Door, restore drills) | Provide a thin admin UI later |
| A-08 | No analytics, ads, social sharing, comments | — |
| A-09 | Budget: low tens of USD per month (Doc 29 §29.11) | Cost-reduced profile listed |
| A-10 | Non-commercial personal use; Author responsible for consent of people appearing in media and for music licensing | — |
| A-11 | Recipient cannot post content in v1 (only "keep" favorites) | Replies are Phase 12 |
| A-12 | Target browsers: last 2 versions of Chrome, Edge, Firefox, Safari; iOS/iPadOS 17+ | Lower tiers fall back to the flat experience |
| A-13 | WCAG 2.2 AA is the accessibility floor | — |
| A-14 | A human (the Author) reviews every change to auth, crypto, authz, media pipeline, IAM | Non-negotiable |
| A-15 | Sound is off by default | — |

## Glossary (ubiquitous language — use these names in code, UI copy and docs)

| Term | Meaning |
|---|---|
| **Light** | A memory rendered in the sky |
| **Chapter** | A constellation: lights the Author chose to connect |
| **Rail** | The time axis the camera travels along |
| **Frontier** | The newest edge of arrived light — "now" of the story |
| **Unlit** | Region of hollow lights: future entries |
| **Unfold** | The transition where a focused light becomes its memory panel |
| **Veil / Threshold** | Pre-authentication scene / arrival sequence after it |
| **Lamp Room** | The warm interior where letters live |
| **Logbook** | The searchable archive (also the accessible full-content view) |
| **Sealed field** | Application-level encrypted column |
| **Knock** | Risk-based login step-up approved by the Author |
| **Admin Door** | WAF gate that hides admin endpoints unless opened |
| **Vault** | Restricted store of original media files |

## Coverage map (master-prompt § → document)

| Prompt § | Doc | Prompt § | Doc | Prompt § | Doc |
|---|---|---|---|---|---|
| 0–3 | 01, 02 | 22 | 18 | 44 | 25 |
| 4 | 03 | 23, 24 | 07 | 45, 46 | 23 |
| 5 | 02 | 25 | 04, 21 | 47, 48 | 24 |
| 6 | 05, 22 | 26 | 04, 15 | 49 | 22 |
| 7 | 06 | 27 | 10 | 50 | 20 |
| 8 | 07 | 28, 29 | 28 | 51 | 25 (Part B) |
| 9 | 04 | 30 | 04 | 52 | 31 |
| 10, 12, 16 | 10 | 31 | 12 | 53 | 32 |
| 11, 43 | 11 | 32 | 10 | 54 | 33, 12 |
| 13 | 16 | 33 | 30 | 55 | 28 |
| 14 | 17 | 34 | 04 | 56 | 34 |
| 15, 18 | 14 | 35 | 10 | 59, 60 | 10, 11 |
| 17 | 13 | 36, 37 | 20 | 61 | Appendix A |
| 19 | 08, 09 | 38 | 21 | | |
| 20 | 19 | 39, 40 | 15 | | |
| 21 | 18 | 41, 42 | 26, 27 | | |

