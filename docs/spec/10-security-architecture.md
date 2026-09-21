# 10 — SECURITY ARCHITECTURE

Goal: *minimize attack surface + enforce authorization server-side + encrypt sensitive data + protect credentials + reduce metadata exposure + detect abuse + recover safely.* Primary boundaries are never secret URLs, frontend passwords, Base64/obfuscation, hidden routes, client-side authorization or face recognition; those may exist only as UX.

## 10.1 Defense in depth
| Layer | Controls | Failure mode → containment | Detection |
|---|---|---|---|
| DNS | DNSSEC, CAA (issuer allow-list), neutral hostnames, wildcard cert (CT logs would otherwise publish `admin.` hostname) | Hijack → HSTS + CAA limit | Registrar alerts |
| CDN/WAF | Geo allow-list `[COUNTRY_CODES]`, AWS managed rules (Common, KnownBadInputs, IP reputation), rate rules, Admin Door block, body size limits | Rule bypass → app-level limits | WAF metrics/alarms |
| TLS | TLS ≥ 1.2 (1.3 preferred), security policy `TLSv1.2_2021`, HSTS 2 y + `includeSubDomains` (preload after stable), no mixed content | Downgrade → HSTS | Synthetic check |
| Application | Strict CSP, zod validation, output via React (no HTML injection), SL-text parser | XSS → CSP + HttpOnly cookie + no secrets in JS | CSP reports |
| Authentication | Passkeys (UV required), Knock, ephemeral sessions | Stolen device → revoke sessions/credentials | Audit + alerts |
| Authorization | Policy module + repository scoping + Postgres RLS | Bug → RLS still blocks | Authz-denied audit events |
| Session | Opaque token, hashed at rest, rotation, revocation | Theft → short idle, revoke, (DBSC when available) | Anomaly events |
| API | Rate limits, idempotency, ETag concurrency, uniform errors | Abuse → 429/WAF | Alarms |
| Database | Private subnets, IAM auth, TLS, least-privilege roles, RLS FORCE, sealed fields | Dump → ciphertext for intimate text | GuardDuty, CloudTrail |
| Object storage | Block Public Access, SSE-KMS, OAC only, no ACLs, versioning | Leak → ciphertext w/o KMS grant | Config rules |
| Backups | Cross-account, Object Lock, separate KMS, offline copy | Account compromise → immutable copies | Backup alarms |

## 10.2 Cookies, sessions, CSRF
- Cookie: `__Host-sl_sid=<256-bit random>; Path=/; Secure; HttpOnly; SameSite=Strict` (no Domain). Only SHA-256 of the token is stored. Session lifetimes in Doc 20 (`security.session`). Rotate token every 24 h of activity and on privilege elevation; revoke on logout, credential revoke, "sign out everywhere".
- SameSite=Strict means arriving via an external link shows the Veil first — intended.
- **CSRF (layered):** SameSite=Strict + reject non-`application/json` bodies + require header `X-SL-Client` + verify `Origin` equals the site origin + if `Sec-Fetch-Site` is present require `same-origin`. State changes never use GET. WebAuthn ceremonies are bound to server-issued challenges.
- CORS: disabled (same-origin only).

## 10.3 Security headers (§35)
Applied by CloudFront response-headers policies (static, media) and `@fastify/helmet` (API); tested in CI against the deployed preview.
<!-- extract: infra/security-headers.json -->
```json
{
  "csp": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; upgrade-insecure-requests; report-uri /api/v1/telemetry/csp",
  "cspNotes": [
    "No inline scripts or styles; Vite build must not emit them. Dynamic styles use CSSOM (element.style), which CSP allows.",
    "If KTX2/Basis textures are ever adopted add 'wasm-unsafe-eval' to script-src; do not add 'unsafe-eval' or 'unsafe-inline'.",
    "Roll out Trusted Types as Report-Only first: require-trusted-types-for 'script'."
  ],
  "headers": {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "accelerometer=(), ambient-light-sensor=(), autoplay=(self), camera=(), display-capture=(), geolocation=(), gyroscope=(self), microphone=(), payment=(), usb=(), xr-spatial-tracking=(), fullscreen=(self), publickey-credentials-get=(self), publickey-credentials-create=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex"
  },
  "cacheControl": {
    "api": "no-store",
    "indexHtml": "no-cache",
    "hashedAssets": "public, max-age=31536000, immutable",
    "media": "private, no-store"
  },
  "logoutHeader": "Clear-Site-Data: \"cache\", \"storage\""
}
```
`robots.txt` disallows all. Safari lacks `Clear-Site-Data`; the client also purges Cache Storage, IndexedDB and revokes object URLs on logout.

## 10.4 Input, output and content safety
zod at every boundary (`.strict()`, max lengths, Unicode NFC normalization); parameterized queries only (Drizzle); story/letter text is **plain text in SL-text**, rendered by our parser into React nodes — no `dangerouslySetInnerHTML`, no HTML sanitizer needed, links disallowed. Search returns plain snippets with match offsets, never HTML. Filenames are never trusted (S3 keys are random UUIDs).

## 10.5 Rate limiting and lockout
| Endpoint class | Limit (per IP unless noted) | On breach |
|---|---|---|
| WAF global | 2,000 req / 5 min | Block 10 min |
| `auth/passkey/options`, `verify` | 10/min, 60/h | 429 + Retry-After |
| 5 failed verifies in 10 min | — | 15-min IP cooldown; alert at ≥ 20/day |
| `auth/enrollment/*` | 5/h; 5 attempts per invite then invite dies | Invite invalidated, alert |
| `media/access` | 300/min per session | 429 |
| `archive/search` | 30/min per session | 429 |
| Admin writes | 120/min per session | 429 |
Counters live in Postgres (atomic upsert). There is **no account lockout** that a stranger could trigger against the Recipient; passkeys have no guessable secret, so throttling is per-IP and global. Under attack: WAF "challenge" mode via Terraform variable.

## 10.6 Encryption (§16)
| What | Where | By whom | Primitive | Keys | Rotation | If compromised | Metadata still visible |
|---|---|---|---|---|---|---|---|
| In transit | edge, ALB→task, task→RDS/S3 | TLS | TLS 1.2+/1.3 | ACM, RDS CA | ACM auto | Downgrade blocked by HSTS | Hostnames, volumes |
| DB at rest | RDS storage/snapshots | RDS | AES-256 via KMS CMK | `alias/sl-db` | CMK yearly | Disk theft → ciphertext | — |
| **Sealed fields** | `story, letter body, captions, alt text, locations, future notes, site texts` | API repository layer | AES-256-GCM, 96-bit random nonce, row-bound AAD | Per-purpose DEK wrapped by KMS CMK `alias/sl-sealed` (multi-Region), unwrapped at boot, memory only | New DEK yearly or on suspicion; old kids retained; optional `reseal` job | DB dump/backup leak → ciphertext; **API task compromise → plaintext (cannot be prevented)** | Titles, dates, chapters, tags, counts, kinds |
| Media at rest | S3 `media` | S3 | SSE-KMS (bucket keys) | `alias/sl-media` | yearly | Bucket-only leak → ciphertext | Object sizes/times |
| Vault | S3 `vault` | S3 | SSE-KMS | `alias/sl-vault`, **API role denied decrypt** | yearly | API compromise cannot read originals | — |
| Backups | cross-account | AWS Backup / S3 | KMS + Object Lock | `alias/sl-backup` (multi-Region) + offline `age` escrow | yearly | Source-account compromise cannot delete/read backups | — |
Reference envelope implementation (validated):

<!-- extract: apps/api/src/crypto/sealed.ts -->
```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface KeyRing {
  activeKid: string;
  /** Returns a 32-byte data key held only in process memory. Throws if unknown. */
  key(kid: string): Buffer;
}
export interface SealContext {
  table: string;
  column: string;
  rowId: string;
}

const VERSION = "v1";
const aad = (ctx: SealContext, kid: string) =>
  Buffer.from(`sl:${VERSION}|${ctx.table}|${ctx.column}|${ctx.rowId}|${kid}`, "utf8");

/** Format: v1.<kid>.<nonce b64url>.<ciphertext||tag b64url>. A row-bound AAD stops ciphertext swapping. */
export function seal(plain: string, ctx: SealContext, ring: KeyRing): string {
  const kid = ring.activeKid;
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", ring.key(kid), nonce);
  c.setAAD(aad(ctx, kid));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final(), c.getAuthTag()]);
  return [VERSION, kid, nonce.toString("base64url"), ct.toString("base64url")].join(".");
}

export function unseal(sealed: string, ctx: SealContext, ring: KeyRing): string {
  const [v, kid, n, body] = sealed.split(".");
  if (v !== VERSION || !kid || !n || !body) throw new Error("SEALED_FORMAT");
  const raw = Buffer.from(body, "base64url");
  if (raw.length < 16) throw new Error("SEALED_FORMAT");
  const d = createDecipheriv("aes-256-gcm", ring.key(kid), Buffer.from(n, "base64url"));
  d.setAAD(aad(ctx, kid));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString("utf8");
}
```

Key hierarchy: KMS CMK (KEK) → `key_registry` row (DEK wrapped with EncryptionContext `{purpose:"sealed",kid}`) → in-memory key ring → `seal()/unseal()`. Boot: unwrap active + retired DEKs; **fail readiness if the active DEK cannot be unwrapped**. KMS key deletion window 30 days; key policy denies `ScheduleKeyDeletion` to all but a break-glass role. Loss scenarios: KMS key deleted → restore from multi-Region replica; AWS account lost → restore from offline escrow (plaintext DEKs encrypted to an offline `age` recipient; optional Shamir 2-of-3 split) using logical DB backup. Search over sealed text is done in the API over an in-memory, short-TTL (5 min) decrypted index (fits A-02).

## 10.7 Secrets
Almost none by design: no DB password (RDS IAM auth via `@aws-sdk/rds-signer`, token refresh in the pool `password` callback); CloudFront signing private key in Secrets Manager (rotated by key-group swap yearly); GitHub deploys via OIDC. `.env.example` lists only non-secrets (Doc 20). Secret scanning (gitleaks) in CI and pre-commit; a test greps the built bundle for any server-only variable name.

## 10.8 Admin security (§27)
1. **Admin Door:** WAF blocks the admin hostname and `/api/v1/admin/*` unless the source IP is in an IP set; `scripts/admin-door open --hours 4` adds the caller's IP (needs MFA'd AWS credentials), `close` removes it. Default closed.
2. Separate hostname (wildcard cert), separate SPA entry, `role=author` required, **elevation**: fresh passkey assertion (≤ 15 min) stored as `elevated_until` on the session; ≥ 2 registered credentials required to leave setup mode (one may be a hardware key).
3. Idle 30 min / absolute 8 h; DBSC-bound session if the browser supports it (feature-detect; Chrome on Windows as of 2026; never required).
4. Upload restrictions (Doc 14): allow-listed types, size caps, quarantine, re-encoding, ffmpeg protocol allow-list, malware scan.
5. Destructive actions: type-to-confirm + step-up + 30-day trash + 5 s undo; hard purge only via scheduled job or CLI.
6. Everything audited; audit rows are append-only for the app role (INSERT-only grants), hash-chained (Phase 8), chain head anchored daily to an Object Lock bucket.
7. No impersonation; "Preview as Recipient" uses a read-only, clearly flagged, audited view.

## 10.9 Optional upgrade: end-to-end encryption ("Sealed Vault v2", not in v1)
Why deferred: it protects against server/cloud compromise but not against device compromise or phishing; it costs recovery complexity, encrypted streaming, and search. **If adopted:** Author client generates a per-memory content key; content keys are wrapped to each Recipient device public key derived from the WebAuthn **PRF** extension output (deterministic per passkey and salt) — no key is ever stored in JS; the Author's client re-wraps keys when the Recipient enrolls a new passkey; media use chunked AES-GCM (64 KiB segments, per-segment nonce) decrypted in a Service Worker or MSE; server search is lost (client-side index); a forgotten/lost passkey loses nothing because the Author holds keys and can re-wrap. Decision gate: choose only if threat model shifts to "cloud/provider compromise is the main risk". A hard-coded or JS-visible key is never acceptable.

## 10.10 What cannot be guaranteed (§59)
A legitimate viewer can screenshot or photograph the screen; a compromised personal device exposes everything on it; anyone holding valid credentials can view what they are authorized to view; a compromised API task can read sealed text; a compromised AWS account is a total loss except immutable backups; client JavaScript cannot hide a secret from someone who controls the browser. Therefore: **no DRM, no right-click blocking, no watermark theatre, no "unbreakable" claims.** Communicate to the Author: the goal is to make attacks costly, visible and recoverable.

## 10.11 Logging (§32)
pino with an **allow-list serializer** (only named fields are logged), redaction of `authorization`, `cookie`, `set-cookie`, request/response bodies never logged, query strings stripped on `/_m/*` and `/enroll`, request IDs random. Never log: passwords, tokens, cookies, story/letter text, captions, raw media URLs or keys, DEKs. Canary test: inject unique canary strings into content and credentials, run the e2e suite, grep all logs — the suite fails if any canary appears. Security events go to a separate log group with restricted access; app logs 30 days, security log group 400 days, audit table 2 years.

## 10.12 Supply chain
Pinned GitHub Actions by commit SHA; OIDC-only deploys; container images built with provenance and SBOM (CycloneDX), scanned (Trivy), tagged immutably in ECR; base images pinned by digest; dependency delay (≥ 3 days) and allow-listed install scripts; Dependabot/Renovate PRs need human approval for anything touching auth, crypto, media, or infra.

## 10.13 Security ↔ usability
Passkeys make strong auth one touch. Knock (Doc 16) only fires on genuinely new geography. Sessions are long enough for daily use (72 h idle) because re-login is one biometric touch and the Veil is part of the ritual.
