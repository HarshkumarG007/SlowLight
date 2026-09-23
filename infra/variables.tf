variable "aws_region" {
  type        = string
  default     = "ap-south-1"
  description = "Primary AWS region for Slow Light (API, RDS, Fargate)."
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment: development | staging | production."
}

variable "allowed_country_codes" {
  type        = list(string)
  default     = ["IN"]
  description = "ISO 3166-1 alpha-2 country codes allowed through the WAF geo-fence. Change before apply. Locked decision D-11."
}

variable "kms_key_arn" {
  type        = string
  description = "ARN of the KMS CMK used for backup vault and data encryption."
}

variable "rds_instance_arn" {
  type        = string
  description = "ARN of the primary RDS Postgres instance to back up."
}

variable "s3_media_bucket_arn" {
  type        = string
  description = "ARN of the media S3 bucket to back up."
}

variable "sns_alert_email" {
  type        = string
  description = "E-mail address that receives CloudWatch alarm notifications."
}

variable "cloudfront_distribution_id" {
  type        = string
  description = "CloudFront distribution ID; used for 5xx alarm metric dimension."
}
