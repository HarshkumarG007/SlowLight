# 27 — SECURITY TEST MATRIX

Automated where possible; "M" = manual/periodic.
| # | Attack | Protection | Test |
|---|---|---|---|
| 1 | Brute force / credential stuffing | Passkeys (no password), per-IP throttle, WAF | 1,000 scripted `verify` attempts → 429 after limit; no lockout of legitimate user from other IP |
| 2 | Enrollment guessing | 256-bit token, phrase, 5 attempts, expiry | Guess phrase 6× → invite dead; reuse consumed token → 409 |
| 3 | Enrollment race | Atomic `UPDATE…RETURNING` | 20 parallel `complete` calls → exactly one credential |
| 4 | Challenge replay | Single-use, TTL 120 s, purpose-bound | Reuse assertion → rejected; expired challenge → rejected |
| 5 | Assertion tampering | WebAuthn verification | Flip bits in signature/authData/clientData → rejected |
| 6 | Wrong origin / RP ID (phishing) | `expectedOrigin`, `expectedRPID` | Assertion for `evil.test` → rejected |
| 7 | Counter rollback (cloned key) | Counter check + anomaly | Lower counter → logged, alert |
| 8 | Session fixation | New token at login/elevation | Pre-login cookie not valid post-login |
| 9 | Session theft | HttpOnly, `__Host-`, Strict, idle/absolute, revoke | JS cannot read cookie; revoked token → 401; expired → 401 |
| 10 | Logout not revoking | Server-side revoke | Reuse old cookie after logout → 401 |
| 11 | XSS (stored) | SL-text parser, React escaping, CSP | Inject `<script>`, `<img onerror>`, SVG, `javascript:` in every text field → rendered inert; CSP blocks inline |
| 12 | XSS (reflected/DOM) | No HTML sinks, lint ban | Search `q` payloads; URL hash payloads; lint fails on `innerHTML` |
| 13 | CSP bypass attempts | No unsafe-inline/eval, `base-uri 'none'` | Inject `<base>`, inline handlers → blocked; CSP report received |
| 14 | CSRF | SameSite=Strict, Origin, Fetch-Metadata, custom header | Cross-site form/fetch → rejected; missing header → 403 |
| 15 | Clickjacking | `frame-ancestors 'none'`, X-Frame-Options | Frame the site → blocked |
| 16 | CORS misconfig | No CORS | Cross-origin fetch with credentials → blocked; no ACAO header |
| 17 | IDOR (memories/letters/assets) | Policy + repository scoping + RLS + UUIDs | Recipient requests draft/archived/other IDs → 404 identical to nonexistent |
| 18 | Mass assignment | `.strict()` zod | Send `status`, `role`, `id` on recipient/patch calls → 400 |
| 19 | SQL injection | Parameterized queries, least-privilege role | sqlmap-style payloads in `q`, ids, cursors → no effect; role lacks DDL |
| 20 | RLS bypass via bug | FORCE RLS | Test-only route with unscoped query as recipient → still filtered |
| 21 | Locked-letter bypass | Body in RLS-protected table, DB clock | Change client clock; call `/letters/:id` early → 423; body absent from all payloads |
| 22 | Time-of-check races | Transactions, `If-Match` | Concurrent publish/edit → one wins, 412 for the other |
| 23 | Upload: wrong type / polyglot | Magic-byte detection, re-encode | JPEG+ZIP, GIFAR, PDF-as-JPG → rejected or sanitized output has no payload |
| 24 | Decompression/pixel bomb | Pixel and duration caps | 60k×60k PNG → rejected before decode |
| 25 | ffmpeg SSRF/LFI | `-protocol_whitelist file,pipe`, no network in worker | HLS/concat playlist referencing `http://` or `/etc/passwd` → fails; no outbound connection |
| 26 | Path traversal / key injection | Random keys, presigned conditions | `../` filenames and metadata ignored; exact key enforced |
| 27 | Malware | ClamAV + re-encode | EICAR upload → quarantined |
| 28 | EXIF/GPS leakage | Metadata strip | `exiftool` on every served variant → no GPS/camera fields |
| 29 | URL guessing (media) | Random keys + signature | Guess/enumerate `/_m/<uuid>/…` → 403 |
| 30 | Signed URL tampering | CloudFront signature | Change path/extension/expiry → 403; expired → 403 |
| 31 | Signed URL replay after expiry | Short TTL | Reuse after 15 min → 403 |
| 32 | Storage exposure | Block Public Access, OAC only | Anonymous GET to S3 object URL/list → 403; Config rule green |
| 33 | Vault access from API role | Key policy deny | Use API creds to `GetObject` vault → AccessDenied |
| 34 | Range abuse | CloudFront/S3 limits, WAF rate | Thousands of tiny ranges → rate-limited |
| 35 | Cache exposure | `no-store`, Clear-Site-Data | Inspect browser cache after use/logout → no private bodies; back button after logout shows Veil |
| 36 | Cache poisoning/deception | Auth-varying responses are `no-store`; no shared cache for API | Add cache-busting headers/paths → no cross-user data |
| 37 | Header injection / open redirect | No redirects with user input; header sanitization | CRLF payloads → rejected |
| 38 | Timing / enumeration | Constant-time compare; uniform errors | Statistical timing test on enrollment verify |
| 39 | DoS on expensive endpoints | Rate limits, timeouts, pagination caps, ReDoS-safe search | Very long/complex `q` → 400/429; search uses no user regex |
| 40 | Log leakage | Allow-list logging | Canary strings in content/credentials → absent from all logs |
| 41 | Secrets in bundle/repo | gitleaks, bundle grep | Planted secret fails CI |
| 42 | Sealed field tamper/swap | AES-GCM AAD | Copy ciphertext to another row → decrypt fails |
| 43 | DB dump readability | Sealed fields | Scan dump: no plaintext of sentinel strings in `*_sealed` |
| 44 | Key loss | KMS MRK, escrow | Drill: restore in second region and from offline escrow |
| 45 | Admin exposure | Admin Door WAF, role, elevation | Door closed → 403 from any IP; recipient session → 403; non-elevated → `STEP_UP_REQUIRED` |
| 46 | Destructive action abuse | Type-to-confirm + step-up + trash | Delete without step-up → 401; restore within 30 days works |
| 47 | Knock bypass | `knock_state` blocks all content routes | Pending session calls `/world` → `KNOCK_REQUIRED` |
| 48 | Supply chain | Pinning, delay, no install scripts, SBOM | New dep with postinstall script → CI fails |
| 49 | IAM over-privilege | Least privilege, policy scan | Conftest denies `*:*`; API role cannot decrypt vault/backup keys |
| 50 | WAF/geo evasion | Geo allow-list, rate rules | Request from disallowed country (simulated) → blocked (M) |
| 51 | CT/DNS metadata leak | Wildcard cert, neutral names | Search CT logs for hostnames → only wildcard (M) |
| 52 | Indexing | robots, X-Robots-Tag | Fetch `robots.txt` and headers on all routes |
| 53 | Prototype pollution / unsafe deserialization | zod strict, no `merge` of user input | `__proto__` payloads → 400 |
| 54 | Ransomware/deletion | Versioning, Object Lock, cross-account | Delete from prod → recover from backup account (drill) |
| 55 | Passkey-provider takeover (M) | Knock on new geography, revoke | Simulate login from new country → Knock triggered |
