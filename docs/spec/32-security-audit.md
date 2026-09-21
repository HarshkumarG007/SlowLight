# 32 — SECURITY AUDIT

*Self-review of this architecture.*

## 32.1 "If this website were publicly discovered tomorrow, what would an attacker try?"
They would find only the Veil (geo allow-list; everything else 403 at the edge if outside allowed countries). Attempts: (1) scan for `/admin`, `/api/v1/admin` → blocked by the Admin Door, indistinguishable from any other blocked path; (2) hammer `auth/options`/`verify` → per-IP throttles, no password to guess; (3) phishing → passkeys are origin-bound, a lookalike domain gets nothing; (4) enumerate `/_m/<uuid>` → 403; (5) probe for S3 buckets → private, Block Public Access; (6) XSS via any field → nothing renders HTML; CSP blocks inline; (7) social-engineer the Author (Knock, Admin Door) → the residual human risk; (8) compromise the Recipient's phone/passkey account → see below.

## 32.2 Questions
| Question | Answer | Residual |
|---|---|---|
| Database leaked? | Exposed: titles, dates, chapters, tags, counts, kinds, user roles, passkey **public** keys, hashed session tokens, audit rows, IP prefixes. **Not** exposed: stories, letters, captions, alt text, locations, future notes, site texts (ciphertext) — unless the attacker also holds KMS decrypt. | Unsealed metadata (R5) |
| Object storage leaked? | Ciphertext (SSE-KMS) without KMS grant; if bucket credentials *and* KMS access leak, derivatives readable; originals additionally need the vault key which the API role lacks | R4/R6 |
| Authenticated session stolen? | Recipient session: read all visible content until idle/absolute expiry or revocation; cannot add credentials, revoke devices, export or touch admin (step-up needs her passkey). Author session: admin blocked unless Door open **and** elevation. Detection: anomaly events, Knock on new geography | R2, R8 |
| Guess media URLs? | No: 128-bit random keys + signature + expiry | — |
| Manipulate IDs? | UUIDs + policy + repository scoping + RLS; 404 for unauthorized | — |
| Access another user's memory? | Only two users, one recipient; recipient cannot see drafts/archived/locked; tested via matrix + RLS | — |
| Upload malicious content? | Only the Author; quarantine, magic-byte detection, caps, re-encode, ffmpeg protocol allow-list, ClamAV, isolated worker role | Author-device compromise + codec 0-day (Low–Med) |
| Private content in logs? | Allow-list serializers, no bodies, canary test in CI | Human error in new code |
| Browser cache exposure? | `no-store` on API and media, Clear-Site-Data + client purge, ephemeral sessions for shared devices | Safari lacks Clear-Site-Data (client purge covers) |
| Auth provider compromised? | There is no third-party IdP. The equivalents: (a) **passkey sync provider account** (Apple/Google) compromise → attacker can present her passkey → Knock on new geography, device list, Author revocation; (b) **AWS account** compromise → total, mitigated only by immutable cross-account backups and offline copy | R3, R6 |

## 32.3 Findings and design-level gaps
1. API task compromise = sealed text and derivatives readable (inherent to server-rendered content; minimized surface, patch cadence, no shell in image, WAF). 2. Human channel: the Knock/Admin Door rely on the Author not being socially engineered → runbook says verify out-of-band. 3. Custom auth carries implementation risk → library-verified ceremonies, 100% branch coverage, human review, external review recommended before launch. 4. Supply chain (npm) → delay + pinning + no install scripts; still non-zero. 5. WAF geo allow-list can lock out travelers → Door script also edits allowed countries. 6. CloudFront signing key compromise lets an attacker mint URLs for known asset IDs → IDs unknown without API access; rotate key group yearly/on suspicion.
**Recommendation:** commission an external penetration test of auth, media, and IAM before inviting the Recipient (Phase 10).
