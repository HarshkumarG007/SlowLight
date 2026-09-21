# 30 — BACKUP & DISASTER RECOVERY

The data is irreplaceable. Assume the primary AWS account can be lost or compromised.

## 30.1 Objectives
| Data | RPO | RTO |
|---|---|---|
| PostgreSQL (content, auth, audit) | ≤ 5 min (PITR) | ≤ 4 h (same region), ≤ 24 h (new region/account) |
| Media derivatives and vault | ≤ 1 h (S3 replication typical) | ≤ 24 h |
| Keys | n/a | KMS MRK replica immediate; offline escrow ≤ 24 h |
| Infrastructure | git | `terraform apply` in backup region ≤ 8 h |
Degraded mode during an outage: static "The sky is resting" page; nothing else runs.

## 30.2 Mechanisms (3-2-1-1-0)
1. **RDS automated backups + PITR** 35 days; daily snapshot copied to the backup account (re-encrypted with `sl-backup`).
2. **Logical dump**: daily `pg_dump -Fc` (contains sealed ciphertext) to `sl-backups` (Object Lock **compliance**, 90 days daily; monthly copies kept 12 months).
3. **Media**: S3 versioning + **cross-account, cross-region replication** of `sl-media` and `sl-vault` into `sl-backups` (Object Lock); delete markers are not propagated.
4. **Keys**: `sl-sealed` and `sl-backup` are multi-Region keys with a replica in the backup region. **Offline escrow**: script `export-escrow` writes the plaintext DEKs encrypted to an offline `age` recipient (private key printed/stored in two physical places; optional Shamir 2-of-3).
5. **Offline copy (human ritual):** every 6 months the Author runs `scripts/export-archive` to an encrypted external drive (originals from the Vault + DB dump + escrow), stored off-site. Zero-trust in the cloud for the "1 offline, 0 errors" requirement.
6. **Audit chain anchor** daily to an Object Lock bucket.
Backup account: separate root, MFA, SCPs deny deleting vaults/objects before retention, no CI access except a write-only replication role.

## 30.3 Restore procedures (runbooks in `docs/runbooks/`)
| Scenario | Steps |
|---|---|
| Bad deploy/migration | Roll back ECS; if data damaged, PITR to timestamp into a new instance, verify, cut over |
| DB loss | Restore latest PITR/snapshot; verify RLS and roles; run `keys:check` |
| Bucket damage/deletion | Restore versions; else copy from backup replica; reprocess from vault if derivatives lost |
| Region loss | Terraform in backup region; restore DB dump; KMS replica; repoint DNS; re-issue CloudFront key group |
| Primary account compromise | Freeze; rotate everything from the backup account; rebuild in a fresh account from git + backups; re-enroll passkeys (author recovery codes) |
| KMS key lost/deleted | Cancel deletion (30-day window) or use MRK replica; last resort offline escrow + logical dump |

## 30.4 Testing
Monthly automated integrity check (checksums of sampled objects, dump readability). **Quarterly restore drill** into a scratch account: restore DB + media, log in with a virtual authenticator, open a memory and its media, verify counts; record time against RPO/RTO. Annual full tabletop (account compromise; key loss). Alarms on backup job failure, replication lag > 1 h, missing daily dump.

## 30.5 Deletion vs backups
Deleting content removes it from primary within 30 days + purge; backups retain up to their retention (documented residual R10).
