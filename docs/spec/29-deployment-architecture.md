# 29 — DEPLOYMENT ARCHITECTURE

## 29.1 Accounts and regions
AWS Organization with `prod` and `backup` accounts (plus optional `sandbox`); root accounts locked with hardware MFA, no access keys; SCPs deny leaving the org, disabling CloudTrail/GuardDuty, and deleting backup vaults. Primary region `[REGION]` (closest to both viewers; check CloudFront VPC-origin availability), backup region `[BACKUP_REGION]`.

## 29.2 Network
VPC 10.20.0.0/16, 2 AZs. Private subnets: **internal ALB** and RDS (no route to the internet). Public subnets (IGW only): Fargate tasks with public IPs but **security groups allowing inbound only from the ALB SG** — avoids NAT/endpoint costs while remaining unreachable from the internet. Upgrade path: NAT or VPC endpoints (S3 gateway free; KMS, Secrets, ECR, Logs interface endpoints). CloudFront **VPC origin** points at the internal ALB (SG allows the CloudFront managed prefix list; the VPC needs an internet gateway attached even though the origin stays private). S3 access via gateway endpoint.

## 29.3 Edge
One CloudFront distribution, wildcard ACM cert (us-east-1), TLS policy `TLSv1.2_2021`, HTTP/3, geo allow-list, WAFv2 web ACL. Behaviors:
| Path | Origin | Cache | Notes |
|---|---|---|---|
| `/assets/*` | `sl-spa` (OAC) | 1 y immutable | Hashed files |
| `/`, `/index.html`, `/enroll` | `sl-spa` | `no-cache` | Security-headers policy |
| `/api/*` | internal ALB (VPC origin) | disabled | All headers/cookies forwarded; `no-store` |
| `/_m/*` | `sl-media` (OAC) | **disabled**, key group required | Range forwarded; `private, no-store` |
| admin host (`door-<random>.<domain>`) | same origins | disabled | WAF **Admin Door** rule: block unless source IP ∈ allow-list |
WAF rules (order): Admin Door → geo allow-list → AWS Common, KnownBadInputs, IP reputation → rate-based (2,000/5 min per IP; stricter on `/api/v1/auth/*`) → default allow. WAF logs with query strings/cookies redacted, 14 days.

## 29.4 Compute
ECS cluster `sl`, service **`api`** (Fargate ARM64, 0.5 vCPU/1 GB, desired 1, autoscale 1–2, circuit-breaker rollback; health `/health`; readiness requires DB + active DEK unwrapped). Task role: `rds-db:connect` (api user), KMS Decrypt/GenerateDataKey on `sealed`, S3 (quarantine presign, media write none), `secretsmanager:GetSecretValue` (CloudFront key, alert address), `ses:SendEmail`, `ecs:RunTask` for the worker task definition only (+ `iam:PassRole` scoped). **Denied:** vault/backup key use, S3 vault. Task **`media-worker`** (Fargate 2 vCPU/4 GB; own SG with egress 443 only; own role: read quarantine, write media/vault, KMS on `media`/`vault`, DB user `sl_worker`), launched on demand and by an EventBridge schedule every 15 min for stragglers; exits after idle 60 s. Images from ECR (immutable tags, scan on push), non-root, read-only rootfs.

## 29.5 Data
RDS PostgreSQL (private subnets), encrypted with CMK, `rds.force_ssl=1`, IAM auth, automated backups + PITR 35 days, deletion protection, single-AZ by default (**Multi-AZ recommended once RTO < 1 h matters**), minor auto-upgrade, parameter logging of connections/disconnections. S3 buckets per Doc 14 with versioning, lifecycle (noncurrent versions 35 days), Block Public Access, TLS-only policies, replication to backup account.

## 29.6 Keys and secrets
KMS CMKs (rotation on): `sl-sealed` (**multi-Region**), `sl-media`, `sl-vault`, `sl-backup` (**multi-Region**), `sl-db`. Key policies grant only named roles; deletion window 30 days; `ScheduleKeyDeletion` restricted to break-glass. Secrets Manager: CloudFront signing private key, alert address. No DB password, no long-lived access keys anywhere.

## 29.7 CI/CD
GitHub Actions with OIDC into per-environment roles (path/branch-scoped trust). `ci.yml`: lint, typecheck, tests, integration (Testcontainers), build, e2e/a11y, perf, SAST (Semgrep/CodeQL), secrets (gitleaks), SCA (OSV), container scan (Trivy), IaC scan (Checkov). `deploy.yml` (manual approval on `main`): build images (provenance + SBOM) → push ECR → `terraform plan` (reviewed) → apply → run migrations as one-off task → update ECS (circuit breaker) → sync SPA to S3 → invalidate `/index.html` → smoke tests (headers, health, signed-URL denial) → alarms armed. Actions pinned by SHA. Rollback: previous task definition/SPA version retained.

## 29.8 Observability
CloudWatch logs (app 30 d; security group 400 d), metrics and alarms → SNS → Author email/SMS: 5xx rate, login-failure spikes, WAF blocked spikes, Knock events, worker failures, queue depth, RDS CPU/storage/connections, backup job failures, replication lag, budget threshold. GuardDuty (incl. S3 protection), CloudTrail organization trail to the logs bucket with Object Lock, AWS Config rules (S3 public access, encryption, IAM MFA). Synthetic check hits only the public Veil.

## 29.9 DNS and mail
Route 53 (or registrar DNS) with DNSSEC, CAA (`amazon.com` only), wildcard cert, neutral apex, no `www`. Alert emails via SES from `alerts.<domain>` with DKIM, SPF, DMARC `p=reject`; content never includes memory details.

## 29.10 Environments
`prod` and on-demand `staging` (same Terraform, smaller sizes, synthetic data). Local: Docker Compose. Promotion by identical artifacts.

## 29.11 Cost envelope (order of magnitude; verify with the AWS calculator)
Largest lines: internal ALB, RDS single-AZ small instance, WAF, Fargate; expect roughly **US$50–90/month** before media storage. Everything else is cents. **Cost-reduced profile** (accepting more ops or weaker isolation): drop WAF to two rules, RDS on the smallest class, ALB→single small EC2 behind the VPC origin, or a Lambda-based API with a serverless Postgres — the code depends only on interfaces (`KeyService`, `ObjectStore`, `Mailer`), so this is an infrastructure swap, not a rewrite.

## 29.12 Provider mapping (if not AWS)
KMS → any KMS with envelope APIs; CloudFront signed URLs → CDN token auth or an authorized proxy; Fargate → any container platform; RDS → any Postgres with PITR and TLS; Object Lock → provider immutability. Re-do Doc 10 §10.6 and Doc 14 §14.4 review if changing.
