# AWS Organization Guardrails & Setup Checklist

- **Status:** READY FOR ACTIVATION
- **Spec Reference:** Spec 00 §A (A-04, A-09), Spec 10 §10.1, Spec 25 (SEC-15), Spec 29 §29.11

This checklist defines non-code cloud organizational guardrails required to satisfy **SEC-15** and prevent account sprawl or catastrophic single-account compromise.

---

## 1. Multi-Account Structure (AWS Organizations)

| Account | Purpose | Access Control |
|---|---|---|
| **Management / Root** | Organization billing & SCP enforcement only. Zero workloads. | FIDO2 Hardware Key MFA. Password in offline physical vault. |
| **`sl-prod` (Primary)** | VPC, ECS Fargate, RDS PostgreSQL, CloudFront, primary S3 buckets (`spa`, `media`, `quarantine`, `vault`). | GitHub OIDC for deployment; IAM Identity Center / SSO with MFA for Author CLI. |
| **`sl-backup` (Isolated)** | Cross-account replication S3 buckets (`backups`), AWS Backup vaults with S3 Object Lock. | Completely separate credentials. Zero cross-account write access from `sl-prod` except replication. |

---

## 2. Root & IAM Account Hardening Checklist

- [ ] **Hardware MFA on Root**: Enforce hardware FIDO2 WebAuthn key (e.g. YubiKey) on AWS Organization management root and all member root accounts.
- [ ] **No Root API Keys**: Verify root access keys are permanently deleted across all accounts.
- [ ] **GitHub Deployment via OIDC**: Zero long-lived AWS IAM access keys stored in GitHub repository secrets. All CI/CD authenticates via AWS IAM OpenID Connect (OIDC) roles.
- [ ] **Author CLI Access**: Access via AWS IAM Identity Center or temporary STS sessions with mandatory MFA.

---

## 3. Service Control Policies (SCPs)

The following SCPs must be applied to the Organization Root or Workload Organizational Unit (OU):

### SCP 1: Region Restriction
Restrict infrastructure deployment strictly to approved primary and backup regions (e.g., `us-east-1` and `us-west-2`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnapprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "cloudfront:*",
        "iam:*",
        "route53:*",
        "support:*",
        "wafv2:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2"
          ]
        }
      }
    }
  ]
}
```

### SCP 2: Protect Security Logging and KMS Key Deletion
Prevent accidental or malicious deletion of CloudTrail audit logs, GuardDuty, or KMS Customer Managed Keys:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDisablingSecurityServices",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:DeleteTrail",
        "cloudtrail:StopLogging",
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromMasterAccount",
        "kms:ScheduleKeyDeletion"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 4. Cross-Account Backup & S3 Object Lock Isolation

1. **Backup Destination**: `s3://sl-backup-<random>/` lives strictly inside the `sl-backup` account.
2. **Object Lock**: S3 Object Lock enabled in **Compliance Mode** with a minimum retention period of 30 days. Neither the Author nor any compromised `sl-prod` role can prematurely delete or overwrite backup objects.
3. **Replication**: S3 Cross-Region Cross-Account Replication with KMS re-encryption (`alias/sl-backup`).

---

## 5. AWS Budget & Cost Alarms (A-09 Budget Profile)

1. **Monthly Budget Cap**: Configured at **$25.00 USD / month**.
2. **Alert Thresholds**:
   - **Warning**: 80% of budget reached ($20.00 USD) -> Email notification to Author.
   - **Critical Forecast**: Forecasted spend exceeds 100% ($25.00 USD) -> Immediate email alert.
3. **Anomaly Detection**: AWS Cost Anomaly Detection enabled on all accounts with a $5.00 threshold for unexpected cost spikes.
