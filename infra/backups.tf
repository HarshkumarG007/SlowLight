# ─────────────────────────────────────────────────────────────────────────────
# AWS Backup — daily snapshots (30-day retention) + cross-account vault copy
# Protects: RDS Postgres, S3 media bucket
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_backup_vault" "primary" {
  name        = "slow-light-primary-${var.environment}"
  kms_key_arn = var.kms_key_arn

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_backup_vault" "secondary" {
  name        = "slow-light-secondary-${var.environment}"
  kms_key_arn = var.kms_key_arn

  # Cross-account: deploy this resource in the secondary AWS account.
  # Set the provider alias to point to the secondary account + region.
  # provider = aws.secondary_account  # uncomment when secondary account exists

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
    Tier        = "cross-account-recovery"
  }
}

# ── IAM role for AWS Backup service ──────────────────────────────────────────

data "aws_iam_policy_document" "backup_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backup" {
  name               = "slow-light-backup-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.backup_assume.json
}

resource "aws_iam_role_policy_attachment" "backup_default" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# ── Backup plan ───────────────────────────────────────────────────────────────

resource "aws_backup_plan" "slow_light" {
  name = "slow-light-${var.environment}"

  rule {
    rule_name         = "daily-30-day-retention"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 2 * * ? *)" # 02:00 UTC daily — low-traffic window

    lifecycle {
      delete_after = 30 # days
    }

    # Copy to secondary cross-account vault for disaster resilience
    copy_action {
      destination_vault_arn = aws_backup_vault.secondary.arn

      lifecycle {
        delete_after = 90 # longer retention on secondary
      }
    }
  }

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Backup selections ─────────────────────────────────────────────────────────

resource "aws_backup_selection" "rds" {
  name         = "slow-light-rds-${var.environment}"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.slow_light.id

  resources = [var.rds_instance_arn]
}

resource "aws_backup_selection" "s3_media" {
  name         = "slow-light-s3-media-${var.environment}"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.slow_light.id

  resources = [var.s3_media_bucket_arn]
}
