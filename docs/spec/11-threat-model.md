# 11 — THREAT MODEL

Method: assets → actors → attack surfaces → STRIDE threats → mitigations → residual risk. Trust boundaries TB1–TB7 are defined in Doc 09 §9.2. Likelihood/impact use L/M/H.

## 11.1 What the application CAN protect vs CANNOT guarantee
| CAN | CANNOT |
|---|---|
| Stop unauthenticated access to any content or media | Prevent a legitimate viewer from screenshotting or photographing the screen |
| Make credential guessing/phishing ineffective (passkeys) | Protect a compromised phone/laptop that holds a live session or passkey |
| Enforce visibility, time locks and object-level authorization server-side (plus RLS) | Hide a secret from anyone who controls the browser |
| Render DB dumps, backups and bucket leaks unreadable for sealed text and media | Protect sealed text if the API task itself is compromised |
| Detect and alert on abuse; revoke sessions/devices quickly | Guarantee zero risk if a passkey-sync provider account (Apple/Google) is compromised |
| Recover from deletion, corruption, or account loss (immutable backups) | Make the AWS control plane trustworthy if root/admin credentials are stolen |

## 11.2 Threat register (summary; full data in JSON)
| ID | Threat | STRIDE | Impact | Key mitigations | Residual |
|---|---|---|---|---|---|
| T01 | Bot/credential attack on login | S | M | Passkeys; per-IP throttles; WAF | Low |
| T02 | Phishing lookalike site | S | H | WebAuthn origin binding; passkeys unusable off-origin | Low |
| T03 | Leaked link used by stranger | S/I | M | Links reveal only the Veil; enrollment fragment + phrase + single use | Low |
| T04 | Stolen session cookie | S | H | HttpOnly/Strict/`__Host-`; idle 72 h; rotation; revoke; DBSC where available; anomaly alert | Medium |
| T05 | Passkey-provider account takeover | S | H | Knock on new geography; device list; Author revoke | Medium |
| T06 | XSS | T/I | H | Strict CSP, no HTML rendering, React escaping, Trusted Types (report→enforce) | Low |
| T07 | CSRF | T | M | SameSite=Strict, Origin/Fetch-Metadata, custom header, JSON only | Low |
| T08 | IDOR / object manipulation | I | H | UUIDv4, policy module, repository scoping, RLS, 404-for-unauthorized | Low |
| T09 | SQL injection | T/I | H | Drizzle parameterization, least-privilege role, RLS | Low |
| T10 | Malicious upload (polyglot, decompression bomb, SSRF via ffmpeg) | T/E | H | Author-only, quarantine, re-encode, pixel/duration caps, `-protocol_whitelist`, sandboxed worker role | Low–Med |
| T11 | Media URL leak | I | M | 60–900 s signed URLs, same-origin, no-referrer, `no-store` | Low |
| T12 | Guessing media URLs | I | M | 128-bit random keys + signature | Negligible |
| T13 | Storage bucket exposure | I | H | Block Public Access, OAC, SSE-KMS, config rules | Low |
| T14 | DB compromise / dump | I | H | Sealed fields, IAM auth, private subnet, RLS | Medium (metadata) |
| T15 | Insider / stolen cloud credentials | E/I | H | MFA, SCPs, least privilege, CloudTrail, Object Lock backups | Medium |
| T16 | Secrets in code/logs | I | H | No secrets by design, gitleaks, allow-list logging, canary test | Low |
| T17 | Cache exposure on shared device | I | M | `no-store`, ephemeral sessions, Clear-Site-Data + client purge | Low |
| T18 | Admin takeover | E | H | Admin Door, passkey+elevation, separate host, step-up | Low |
| T19 | Supply-chain compromise | T/E | H | Pinning, delay, no install scripts, SBOM, OIDC, review | Medium |
| T20 | DoS on origin | D | M | CloudFront/WAF, rate limits, small footprint | Low |
| T21 | Ransomware/deletion of data | D | H | Versioning, cross-account Object Lock backups, offline copy | Low |
| T22 | Time-lock bypass (client-side) | E | M | Server never sends sealed letter body before `unlock` | Low |
| T23 | Log leakage of intimate content | I | M | Allow-list logging + canary tests | Low |
| T24 | Race conditions (invite reuse, double publish) | T | M | Single-use with `UPDATE … WHERE consumed_at IS NULL RETURNING`; transactions | Low |
| T25 | Certificate-transparency / DNS metadata | I | L | Wildcard cert, neutral names | Low |
| T26 | Coerced or curious Author (privacy of Recipient) | I | M | Recipient activity not exposed to admin; transparency page for her | Policy-level |

## 11.3 Machine-readable model (§43)
<!-- extract: security/threat-model.json -->
```json
{
  "assets": [
    {"id":"A1","name":"Intimate text (stories, letters, captions, future notes)","class":"S3","where":"Postgres sealed fields, backups"},
    {"id":"A2","name":"Photos, videos, audio derivatives","class":"S3","where":"S3 media"},
    {"id":"A3","name":"Original media files (with metadata)","class":"S3","where":"S3 vault, offline archive"},
    {"id":"A4","name":"Location labels and coordinates","class":"S3","where":"Postgres sealed"},
    {"id":"A5","name":"Passkey public credentials and sessions","class":"S1","where":"Postgres"},
    {"id":"A6","name":"KMS keys, DEKs, CloudFront signing key","class":"S3","where":"KMS, Secrets Manager, process memory"},
    {"id":"A7","name":"Audit and security logs","class":"S1","where":"Postgres, CloudWatch"},
    {"id":"A8","name":"Titles, dates, chapters, tags (unsealed metadata)","class":"S2","where":"Postgres"},
    {"id":"A9","name":"Backups and escrow","class":"S3","where":"Backup account, offline"},
    {"id":"A10","name":"Source code, IaC, CI credentials","class":"S1","where":"GitHub, AWS"},
    {"id":"A11","name":"The Recipient's trust and privacy","class":"S3","where":"Design and policy"}
  ],
  "threatActors": [
    {"id":"TA1","name":"Random internet visitor","capability":"low","motivation":"curiosity"},
    {"id":"TA2","name":"Automated bot","capability":"low-medium","motivation":"opportunistic"},
    {"id":"TA3","name":"Credential attacker","capability":"medium","motivation":"account takeover"},
    {"id":"TA4","name":"Leaked-link holder","capability":"low","motivation":"curiosity or malice"},
    {"id":"TA5","name":"Attacker with compromised browser or device","capability":"high on that device","motivation":"data theft"},
    {"id":"TA6","name":"Malicious insider or Author-side compromise","capability":"high","motivation":"varied"},
    {"id":"TA7","name":"Compromised cloud account holder","capability":"very high","motivation":"data theft or destruction"},
    {"id":"TA8","name":"Stolen-session holder","capability":"medium","motivation":"data theft"},
    {"id":"TA9","name":"Database or storage compromiser","capability":"high","motivation":"data theft"},
    {"id":"TA10","name":"API abuser","capability":"medium","motivation":"enumeration, DoS"},
    {"id":"TA11","name":"XSS attacker","capability":"medium","motivation":"session/data theft"},
    {"id":"TA12","name":"CSRF attacker","capability":"low-medium","motivation":"forced actions"},
    {"id":"TA13","name":"Injection attacker","capability":"medium-high","motivation":"data theft"},
    {"id":"TA14","name":"Media URL leaker or scraper","capability":"low","motivation":"content access"},
    {"id":"TA15","name":"Supply-chain attacker","capability":"high","motivation":"broad compromise"},
    {"id":"TA16","name":"Someone with brief physical access to the Recipient's unlocked device","capability":"low","motivation":"curiosity"}
  ],
  "attackSurfaces": [
    {"id":"AS1","name":"Veil and auth endpoints","boundary":"TB1"},
    {"id":"AS2","name":"Enrollment ceremony","boundary":"TB1"},
    {"id":"AS3","name":"Content and search API","boundary":"TB1/TB3"},
    {"id":"AS4","name":"Media access endpoint and /_m/*","boundary":"TB1/TB4"},
    {"id":"AS5","name":"Admin API and console","boundary":"TB7"},
    {"id":"AS6","name":"Upload path and media worker","boundary":"TB5"},
    {"id":"AS7","name":"Static SPA and CSP","boundary":"TB1/TB6"},
    {"id":"AS8","name":"Database and RLS","boundary":"TB3"},
    {"id":"AS9","name":"AWS control plane and IAM","boundary":"TB4"},
    {"id":"AS10","name":"CI/CD and dependencies","boundary":"outside"},
    {"id":"AS11","name":"Logs and telemetry","boundary":"TB4"},
    {"id":"AS12","name":"Browser storage and caches on client devices","boundary":"TB6"}
  ],
  "threats": [
    {"id":"T01","actor":"TA2","surface":"AS1","stride":"S","asset":"A5","likelihood":"H","impact":"M","mitigations":["M01","M02","M03"]},
    {"id":"T02","actor":"TA3","surface":"AS1","stride":"S","asset":"A5","likelihood":"M","impact":"H","mitigations":["M01"]},
    {"id":"T03","actor":"TA4","surface":"AS2","stride":"S","asset":"A5","likelihood":"M","impact":"H","mitigations":["M04","M02"]},
    {"id":"T04","actor":"TA8","surface":"AS12","stride":"S","asset":"A1","likelihood":"M","impact":"H","mitigations":["M05","M06","M07"]},
    {"id":"T05","actor":"TA3","surface":"AS1","stride":"S","asset":"A1","likelihood":"L","impact":"H","mitigations":["M08","M06"]},
    {"id":"T06","actor":"TA11","surface":"AS7","stride":"T","asset":"A1","likelihood":"L","impact":"H","mitigations":["M09","M10"]},
    {"id":"T07","actor":"TA12","surface":"AS3","stride":"T","asset":"A11","likelihood":"L","impact":"M","mitigations":["M11"]},
    {"id":"T08","actor":"TA10","surface":"AS3","stride":"I","asset":"A1","likelihood":"M","impact":"H","mitigations":["M12","M13"]},
    {"id":"T09","actor":"TA13","surface":"AS3","stride":"I","asset":"A1","likelihood":"L","impact":"H","mitigations":["M14","M13"]},
    {"id":"T10","actor":"TA6","surface":"AS6","stride":"E","asset":"A6","likelihood":"L","impact":"H","mitigations":["M15","M16"]},
    {"id":"T11","actor":"TA14","surface":"AS4","stride":"I","asset":"A2","likelihood":"L","impact":"M","mitigations":["M17"]},
    {"id":"T12","actor":"TA1","surface":"AS4","stride":"I","asset":"A2","likelihood":"L","impact":"M","mitigations":["M17"]},
    {"id":"T13","actor":"TA9","surface":"AS9","stride":"I","asset":"A2","likelihood":"L","impact":"H","mitigations":["M18","M19"]},
    {"id":"T14","actor":"TA9","surface":"AS8","stride":"I","asset":"A1","likelihood":"L","impact":"H","mitigations":["M20","M13"]},
    {"id":"T15","actor":"TA7","surface":"AS9","stride":"E","asset":"A9","likelihood":"L","impact":"H","mitigations":["M21","M22"]},
    {"id":"T16","actor":"TA15","surface":"AS10","stride":"I","asset":"A6","likelihood":"L","impact":"H","mitigations":["M23"]},
    {"id":"T17","actor":"TA16","surface":"AS12","stride":"I","asset":"A2","likelihood":"M","impact":"M","mitigations":["M24","M06"]},
    {"id":"T18","actor":"TA6","surface":"AS5","stride":"E","asset":"A1","likelihood":"L","impact":"H","mitigations":["M25","M26"]},
    {"id":"T19","actor":"TA15","surface":"AS10","stride":"T","asset":"A10","likelihood":"M","impact":"H","mitigations":["M23"]},
    {"id":"T20","actor":"TA10","surface":"AS1","stride":"D","asset":"A11","likelihood":"M","impact":"M","mitigations":["M02","M03"]},
    {"id":"T21","actor":"TA7","surface":"AS9","stride":"D","asset":"A9","likelihood":"L","impact":"H","mitigations":["M21","M27"]},
    {"id":"T22","actor":"TA5","surface":"AS3","stride":"E","asset":"A1","likelihood":"M","impact":"M","mitigations":["M28"]},
    {"id":"T23","actor":"TA9","surface":"AS11","stride":"I","asset":"A1","likelihood":"L","impact":"M","mitigations":["M29"]},
    {"id":"T24","actor":"TA10","surface":"AS2","stride":"T","asset":"A5","likelihood":"L","impact":"M","mitigations":["M04","M14"]},
    {"id":"T25","actor":"TA1","surface":"AS7","stride":"I","asset":"A11","likelihood":"M","impact":"L","mitigations":["M30"]}
  ],
  "mitigations": [
    {"id":"M01","control":"Passkeys with user verification; origin-bound WebAuthn"},
    {"id":"M02","control":"Per-IP and global rate limits; WAF rules"},
    {"id":"M03","control":"Geo allow-list and managed rule groups"},
    {"id":"M04","control":"Enrollment: fragment token + out-of-band phrase, single-use atomic consume, expiry, attempt cap, Author notification"},
    {"id":"M05","control":"HttpOnly, Secure, SameSite=Strict, __Host- cookie; token hashed at rest"},
    {"id":"M06","control":"Session revocation, device management, sign-out-everywhere, idle/absolute timeouts, rotation"},
    {"id":"M07","control":"DBSC binding when supported (optional)"},
    {"id":"M08","control":"Knock: Author-approved step-up on new geography"},
    {"id":"M09","control":"Strict CSP without unsafe-inline/eval; Trusted Types rollout"},
    {"id":"M10","control":"No HTML rendering pipeline; SL-text parser to React nodes"},
    {"id":"M11","control":"Origin/Fetch-Metadata checks, custom header, JSON-only, SameSite=Strict"},
    {"id":"M12","control":"Central policy module; deny by default; 404 for unauthorized objects"},
    {"id":"M13","control":"Postgres RLS (FORCE) with per-transaction role settings"},
    {"id":"M14","control":"Parameterized queries; zod validation; transactional single-use operations"},
    {"id":"M15","control":"Upload quarantine, re-encoding, size/pixel/duration caps, ffmpeg protocol allow-list, ClamAV"},
    {"id":"M16","control":"Separate worker task role with no access to sealed keys or signing key"},
    {"id":"M17","control":"Short-lived same-origin CloudFront signed URLs; random keys; no-referrer; no-store"},
    {"id":"M18","control":"S3 Block Public Access, OAC only, no ACLs, AWS Config rules"},
    {"id":"M19","control":"SSE-KMS with restrictive key policies; vault key denied to API role"},
    {"id":"M20","control":"Sealed-field envelope encryption with row-bound AAD"},
    {"id":"M21","control":"MFA everywhere, SCPs, least-privilege IAM, CloudTrail, separate backup account"},
    {"id":"M22","control":"Object Lock (compliance) backups and offline escrow"},
    {"id":"M23","control":"Pinned deps and actions, dependency delay, no install scripts, SBOM, OIDC deploy, human review of critical paths"},
    {"id":"M24","control":"Cache-Control no-store; ephemeral sessions; Clear-Site-Data and client purge"},
    {"id":"M25","control":"Admin Door WAF gate; separate host; role check"},
    {"id":"M26","control":"Elevation via fresh passkey assertion; type-to-confirm; audit"},
    {"id":"M27","control":"Versioning, replication, restore drills"},
    {"id":"M28","control":"Server withholds locked letter bodies; time checked in policy, never client"},
    {"id":"M29","control":"Allow-list logging; canary leak test"},
    {"id":"M30","control":"Wildcard certificate; neutral hostnames; robots and noindex headers"}
  ],
  "residualRisks": [
    {"id":"R1","risk":"Screenshots or photos of the screen by a legitimate viewer","accepted":true},
    {"id":"R2","risk":"Compromised Recipient or Author device with live session","accepted":true,"reduce":"short idle, revoke, DBSC"},
    {"id":"R3","risk":"Passkey-sync provider account compromise","accepted":true,"reduce":"Knock, device list"},
    {"id":"R4","risk":"API task compromise exposes sealed text and derivative media","accepted":true,"reduce":"minimal surface, patching, review"},
    {"id":"R5","risk":"Unsealed metadata (titles, dates, tags) visible on DB leak","accepted":true,"reduce":"author guidance: keep titles evocative"},
    {"id":"R6","risk":"AWS root/admin compromise","accepted":true,"reduce":"MFA, SCPs, immutable cross-account backups, offline copy"},
    {"id":"R7","risk":"Supply-chain zero-day in a dependency","accepted":true,"reduce":"dependency delay, minimal deps, fast patch"},
    {"id":"R8","risk":"Signed media URLs valid until expiry after session revocation","accepted":true,"reduce":"60-900 s lifetimes"},
    {"id":"R9","risk":"Social engineering of the Author (e.g., to open the Admin Door or approve a Knock)","accepted":true,"reduce":"runbook, out-of-band verification"},
    {"id":"R10","risk":"Backups retain deleted content until retention expires","accepted":true,"reduce":"documented retention"}
  ]
}
```
