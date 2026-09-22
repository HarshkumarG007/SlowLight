/**
 * KMS Customer Managed Keys for Slow Light.
 *
 * Key deletion window is 30 days (spec §10.6).
 * ScheduleKeyDeletion is denied to all but a break-glass role (IAM policy, not in this module).
 * Multi-Region keys: sl-sealed and sl-backup replicas defined separately (Phase 11).
 */

resource "aws_kms_key" "sl_sealed" {
  description             = "Slow Light: sealed fields DEK envelope encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "sl-sealed"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "sl_sealed" {
  name          = "alias/sl-sealed"
  target_key_id = aws_kms_key.sl_sealed.key_id
}

resource "aws_kms_key" "sl_media" {
  description             = "Slow Light: media bucket SSE-KMS"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "sl-media"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "sl_media" {
  name          = "alias/sl-media"
  target_key_id = aws_kms_key.sl_media.key_id
}

resource "aws_kms_key" "sl_vault" {
  description             = "Slow Light: vault bucket SSE-KMS (API role denied decrypt)"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "sl-vault"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "sl_vault" {
  name          = "alias/sl-vault"
  target_key_id = aws_kms_key.sl_vault.key_id
}
