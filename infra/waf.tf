# ─────────────────────────────────────────────────────────────────────────────
# WAF v2 Web ACL — attached to CloudFront (scope = CLOUDFRONT, us-east-1)
# Provides: rate limiting, anonymous IP blocking, geo-restriction, admin door.
# ─────────────────────────────────────────────────────────────────────────────

# CloudFront WAF resources must be in us-east-1 regardless of app region
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ── Managed rule groups ───────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "slow_light" {
  provider    = aws.us_east_1
  name        = "slow-light-${var.environment}"
  scope       = "CLOUDFRONT"
  description = "Slow Light edge WAF — rate limit, anon-IP block, geo-fence, admin door"

  default_action {
    allow {}
  }

  # 1. AWS Managed: Anonymous IP list (Tor, VPNs, hosting ranges)
  rule {
    name     = "AnonymousIPBlock"
    priority = 10
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AnonymousIPBlock"
      sampled_requests_enabled   = true
    }
  }

  # 2. AWS Managed: Known bad inputs (SQLi, XSS probes)
  rule {
    name     = "KnownBadInputs"
    priority = 20
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # 3. Geo-restriction: block all non-domestic (non-IN) traffic
  # IMPORTANT: Change country code(s) to match actual recipient geography before
  # terraform apply prod. Consult Author before modifying. Locked decision D-11.
  rule {
    name     = "GeoRestrict"
    priority = 30
    action { block {} }
    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = var.allowed_country_codes
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoRestrict"
      sampled_requests_enabled   = true
    }
  }

  # 4. Rate limit: 200 req / 5-min window per IP on /api/*
  rule {
    name     = "APIRateLimit"
    priority = 40
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 200
        aggregate_key_type = "IP"
        scope_down_statement {
          byte_match_statement {
            field_to_match { uri_path {} }
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # 5. Admin Door: /admin/* is reachable ONLY from the whitelisted CIDR
  # Activate by running: pnpm cli admin-door --open --cidr <your-ip>/32
  # This rule is disabled by default (admin door is closed).
  rule {
    name     = "AdminDoorBlock"
    priority = 50
    action { block {} }
    statement {
      and_statement {
        statement {
          byte_match_statement {
            field_to_match { uri_path {} }
            positional_constraint = "STARTS_WITH"
            search_string         = "/admin"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          not_statement {
            statement {
              ip_set_reference_statement {
                arn = aws_wafv2_ip_set.admin_door.arn
              }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AdminDoorBlock"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "SlowLightWAF"
    sampled_requests_enabled   = true
  }

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Admin Door IP set — starts empty; populated by `pnpm cli admin-door --open`
resource "aws_wafv2_ip_set" "admin_door" {
  provider           = aws.us_east_1
  name               = "slow-light-admin-door-${var.environment}"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = [] # managed at runtime by admin-door CLI

  tags = {
    Project     = "slow-light"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "waf_web_acl_arn" {
  description = "ARN to attach to the CloudFront distribution"
  value       = aws_wafv2_web_acl.slow_light.arn
  sensitive   = false
}

output "admin_door_ip_set_arn" {
  description = "ARN used by the admin-door CLI script to whitelist IPs"
  value       = aws_wafv2_ip_set.admin_door.arn
  sensitive   = false
}
