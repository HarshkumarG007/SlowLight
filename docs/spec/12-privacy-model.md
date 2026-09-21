# 12 — PRIVACY MODEL

## 12.1 Principles
Collect the minimum; keep it the shortest time; never observe the Recipient. Personal, non-commercial use between consenting people; privacy-by-design still applies.

## 12.2 Data inventory and classification
| Class | Examples | Stored | Protection | Retention |
|---|---|---|---|---|
| S3 intimate | stories, letters, captions, alt text, locations, future notes, media, originals | Postgres sealed; S3 SSE-KMS; vault | Sealed/KMS, RLS, signed URLs | Until Author deletes (+30 d trash, + backup retention) |
| S2 personal | display names, Author email (alerts) | Postgres sealed | Sealed | Account life |
| S2 metadata | titles, dates, chapters, tags | Postgres plain | RLS, TLS, KMS at rest | With content |
| S1 security | sessions, credential public keys, IP prefix/country, UA family, audit | Postgres | RLS, hashed tokens | Sessions 30 d after expiry; audit 2 y |
| S1 edge logs | WAF logs (query strings redacted) | CloudWatch/S3 | Restricted | 14 days |
| S0 | Static assets, fonts | S3 | Public-safe | — |

## 12.3 Minimization decisions
No analytics; no third-party requests; fonts self-hosted; IP kept only as /24 (/48) + country; full IP appears only in edge logs (14 d). No email for the Recipient. EXIF/GPS stripped from all served media; originals in the Vault are never served. Locations default to city precision and are labels only (no map, no coordinates sent to client). No read receipts, no visit counters, no per-item "opened" tracking; the only recipient-state stored is `letters.opened_at` (needed for seal ceremony, visible to her) and `user_state.last_seen_world_at` (for "new since your last visit"); neither is exposed to Author endpoints (`privacy.recipientActivityVisibleToAuthor=false`). Audit `content.access` events are disabled by default.

## 12.4 Transparency for the Recipient
`/settings/security` shows her own devices (label, added, last used) and sessions (approximate place, browser, last active) with revoke buttons, and her recent sign-ins. Plain-language note: "The Author can see security events (sign-ins, new devices). The Author cannot see which memories you open."

## 12.5 Metadata leakage inventory
Certificate Transparency (wildcard cert), DNS names and TLS SNI (neutral domain, no romantic words), ISP-visible traffic volume (unavoidable), S3 object sizes and timing (residual), backups retain deleted data until retention expires (documented), passkey provider (Apple/Google) holds her private key material under her own account, `Referer` suppressed (`no-referrer`).

## 12.5b Third-party processors
AWS (hosting, KMS, SES for security alerts with no content), GitHub (code and CI, no data), passkey sync provider chosen by each user. Nothing else. Adding any processor requires an ADR and a privacy review.

## 12.6 Ethical guardrails
The Author must not use admin tools to monitor the Recipient; the product provides none. Photos of other people are the Author's responsibility (A-10). Copyrighted music is not embedded. A memory can be `archived` (hidden) or letters `held` so nothing painful is forced on her.
