# 31 — PRODUCTION CHECKLIST

**Domain/TLS/DNS** ☐ neutral domain, WHOIS privacy ☐ DNSSEC ☐ CAA ☐ wildcard cert ☐ HSTS after stability (preload optional) ☐ admin hostname unlisted.
**Accounts** ☐ hardware-MFA root, no access keys ☐ org SCPs ☐ separate backup account ☐ budget alarm ☐ CODEOWNERS for auth/crypto/authz/media/infra.
**Secrets/keys** ☐ CloudFront signing key in Secrets Manager ☐ KMS policies reviewed ☐ MRK replicas ☐ escrow created and stored ☐ no `.env` in repo ☐ bundle secret grep passes.
**Database** ☐ private, IAM auth, TLS forced ☐ RLS verified on prod ☐ PITR on, deletion protection ☐ roles least-privilege ☐ migrations applied via task.
**Storage** ☐ Block Public Access (account + buckets) ☐ OAC only ☐ vault denied to API ☐ versioning/lifecycle ☐ replication healthy ☐ Object Lock on backups.
**Authentication** ☐ Author has 2+ passkeys (one hardware) ☐ recovery codes printed ☐ Recipient enrolled in person; second device added ☐ Knock delivery tested ☐ session lifetimes per config.
**Edge** ☐ WAF rules and geo allow-list ☐ Admin Door closed by default; open/close tested ☐ rate limits verified ☐ headers/CSP verified on prod ☐ `robots.txt`, `X-Robots-Tag`.
**Observability** ☐ alarms tested ☐ GuardDuty/CloudTrail/Config on ☐ canary log test green ☐ alert email deliverable (DKIM/DMARC).
**Supply chain** ☐ SCA/SAST/secrets/container/IaC scans green ☐ actions pinned ☐ SBOM stored.
**Recovery** ☐ restore drill passed with recorded RTO/RPO ☐ offline archive made ☐ runbooks printed.
**Quality** ☐ mobile (iPhone Safari, Android Chrome) ☐ desktop Chrome/Safari/Firefox/Edge ☐ axe + screen-reader pass ☐ perf budgets ☐ reduced-motion/flat mode ☐ offline/failure states.
**Content** ☐ placeholders replaced via admin ☐ every image has alt ☐ letters' unlock settings reviewed ☐ nothing painful published without intent (`held`/`archived` considered).
**Launch day** ☐ Door opened only while editing ☐ final read-through as Recipient (preview) ☐ tell her the security page exists.
