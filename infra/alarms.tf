# ─────────────────────────────────────────────────────────────────────────────
# CloudWatch Alarms — operational visibility for Slow Light production
# Covers: API 5xx errors, CloudFront error rate, RDS storage, WAF block spikes
# ─────────────────────────────────────────────────────────────────────────────

# ── SNS topic for alarm notifications ────────────────────────────────────────

resource "aws_sns_topic" "alarms" {
  name              = "slow-light-alarms-${var.environment}"
  kms_master_key_id = var.kms_key_arn

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.sns_alert_email
}

# ── CloudFront 5xx Error Rate ─────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx" {
  alarm_name          = "slow-light-cloudfront-5xx-${var.environment}"
  alarm_description   = "CloudFront 5xx error rate exceeded 1% — investigate API/Fargate health."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1 # percent

  metric_name = "5xxErrorRate"
  namespace   = "AWS/CloudFront"
  period      = 300 # 5 minutes
  statistic   = "Average"
  unit        = "Percent"

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
    Region         = "Global"
  }

  alarm_actions             = [aws_sns_topic.alarms.arn]
  ok_actions                = [aws_sns_topic.alarms.arn]
  insufficient_data_actions = []
  treat_missing_data        = "notBreaching"

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── RDS Free Storage Space ────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "slow-light-rds-storage-${var.environment}"
  alarm_description   = "RDS free storage is below 2 GB — consider expanding volume."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = 2147483648 # 2 GiB in bytes

  metric_name = "FreeStorageSpace"
  namespace   = "AWS/RDS"
  period      = 300
  statistic   = "Average"
  unit        = "Bytes"

  dimensions = {
    DBInstanceIdentifier = "slow-light-${var.environment}"
  }

  alarm_actions             = [aws_sns_topic.alarms.arn]
  ok_actions                = [aws_sns_topic.alarms.arn]
  insufficient_data_actions = []
  treat_missing_data        = "missing"

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── WAF Block Spike ───────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "waf_block_spike" {
  alarm_name          = "slow-light-waf-block-spike-${var.environment}"
  alarm_description   = "WAF blocked > 500 requests in 5 min — possible attack in progress."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 500

  metric_name = "BlockedRequests"
  namespace   = "AWS/WAFV2"
  period      = 300
  statistic   = "Sum"

  dimensions = {
    WebACL = "slow-light-${var.environment}"
    Region = "us-east-1" # WAF CloudFront ACLs are always in us-east-1
    Rule   = "ALL"
  }

  alarm_actions             = [aws_sns_topic.alarms.arn]
  ok_actions                = []
  insufficient_data_actions = []
  treat_missing_data        = "notBreaching"

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── RDS CPU Utilization ───────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "slow-light-rds-cpu-${var.environment}"
  alarm_description   = "RDS CPU > 80% for 10 min — consider a read replica or query tuning."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 80

  metric_name = "CPUUtilization"
  namespace   = "AWS/RDS"
  period      = 300
  statistic   = "Average"
  unit        = "Percent"

  dimensions = {
    DBInstanceIdentifier = "slow-light-${var.environment}"
  }

  alarm_actions             = [aws_sns_topic.alarms.arn]
  ok_actions                = [aws_sns_topic.alarms.arn]
  insufficient_data_actions = []
  treat_missing_data        = "missing"

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
