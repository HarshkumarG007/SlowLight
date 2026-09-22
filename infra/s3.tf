/**
 * S3 buckets for Slow Light (all private; Block Public Access; TLS-only policy; versioning on).
 * Access method: CloudFront OAC only (media/SPA); presigned POST (quarantine); worker (vault).
 *
 * See spec §14.1 for the full bucket matrix.
 */

locals {
  bucket_names = {
    quarantine = "sl-quarantine-${var.environment}"
    media      = "sl-media-${var.environment}"
    vault      = "sl-vault-${var.environment}"
    spa        = "sl-spa-${var.environment}"
    logs       = "sl-logs-${var.environment}"
  }
}

# ── Quarantine ─────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "quarantine" {
  bucket = local.bucket_names.quarantine
  tags   = { Name = "sl-quarantine", Environment = var.environment }
}

resource "aws_s3_bucket_public_access_block" "quarantine" {
  bucket                  = aws_s3_bucket.quarantine.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sl_media.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    id     = "expire-quarantine"
    status = "Enabled"
    expiration { days = 1 } # 24-hour hard expiry on unprocessed uploads
  }
}

# ── Media ──────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "media" {
  bucket = local.bucket_names.media
  tags   = { Name = "sl-media", Environment = var.environment }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sl_media.arn
    }
    bucket_key_enabled = true # reduce KMS API calls
  }
}

# ── Vault ──────────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "vault" {
  bucket = local.bucket_names.vault
  tags   = { Name = "sl-vault", Environment = var.environment }
}

resource "aws_s3_bucket_public_access_block" "vault" {
  bucket                  = aws_s3_bucket.vault.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "vault" {
  bucket = aws_s3_bucket.vault.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "vault" {
  bucket = aws_s3_bucket.vault.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sl_vault.arn
    }
  }
}
