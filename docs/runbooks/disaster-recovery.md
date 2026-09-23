# Disaster Recovery Runbook

> **Audience:** Author (operator) only  
> **Classification:** Operational — do not publish publicly  
> **Last updated:** 2026-09-22  

---

## 1. Overview

This runbook describes how to recover Slow Light from the following failure scenarios:

| Scenario | RPO | RTO |
|---|---|---|
| Single AZ failure (Fargate/RDS multi-AZ failover) | 0 s (automatic) | < 2 min |
| Full region outage — restore from RDS snapshot | < 24 h | < 1 h |
| Total account compromise — restore from offline S3 escrow | < 24 h | < 4 h |

---

## 2. Prerequisites

- AWS CLI configured with operator profile (`aws configure --profile slow-light-ops`).
- Access to offline escrow: USB drive or encrypted cloud store per IAM/escrow SOP.
- `pnpm cli` available (`pnpm install --frozen-lockfile` in the repo root).

---

## 3. Scenario A — AZ failure (automated)

RDS Multi-AZ and ECS Fargate handle this transparently. No manual steps required.

**Verify:** Monitor the `slow-light-cloudfront-5xx-production` CloudWatch alarm.  
If the alarm clears within 5 minutes → incident resolved automatically.

---

## 4. Scenario B — Region Outage: Restore from RDS Snapshot

### Step 1 – Find the latest backup
```bash
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name slow-light-primary-production \
  --profile slow-light-ops \
  --query 'RecoveryPoints[0].RecoveryPointArn'
```

### Step 2 – Restore RDS instance
```bash
aws backup start-restore-job \
  --recovery-point-arn <arn-from-step-1> \
  --iam-role-arn arn:aws:iam::<account>:role/slow-light-backup-role-production \
  --resource-type RDS \
  --metadata '{"DBInstanceIdentifier":"slow-light-restore","MultiAZ":"true","DBInstanceClass":"db.t4g.medium","Engine":"postgres","LicenseModel":"postgresql-license"}' \
  --profile slow-light-ops
```

### Step 3 – Update DNS / environment variable
Once the new RDS endpoint is available, update the `DATABASE_URL` secret in AWS Secrets Manager and redeploy the Fargate service.

### Step 4 – Verify data integrity
```bash
pnpm cli restore-drill --env production
```

---

## 5. Scenario C — Account Compromise: Restore from Offline Escrow

> **STOP** — Only proceed if you have verified total account compromise. This is the last resort path.

### Step 1 – Retrieve offline escrow
Locate the encrypted USB drive or the offline cloud escrow bundle. Decrypt using the offline KMS key stored in the physical escrow vault per the KMS escrow procedure.

### Step 2 – Provision a clean account
Create a new AWS account under the organization. Run:
```bash
cd infra
terraform init
terraform apply -var-file=prod.tfvars
```

### Step 3 – Restore Postgres from escrow dump
```bash
# Copy the pg_dump file to the new RDS instance
pg_restore --no-owner -d "$DATABASE_URL" ./escrow/slow-light-pgdump-<timestamp>.dump
```

### Step 4 – Re-provision secrets
Use the decrypted escrow bundle to repopulate AWS Secrets Manager in the new account. **Do not reuse compromised KMS keys.**

### Step 5 – Author re-enrollment
The Author will need to enroll fresh passkeys once the new environment is live. Run:
```bash
pnpm cli invite:create --role author --ttl 3600
```

---

## 6. Post-recovery checklist

- [ ] All CloudWatch alarms green.
- [ ] `/api/health` returns `{"status":"ok"}`.
- [ ] Author can authenticate and access admin console.
- [ ] Audit log hash chain passes validation: `pnpm cli audit:verify`.
- [ ] Update incident report in `docs/incidents/`.
