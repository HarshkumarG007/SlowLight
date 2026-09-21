variable "aws_region" {
  type    = string
  default = "us-east-1"
  description = "The primary AWS region to deploy Slow Light infrastructure."
}

variable "environment" {
  type    = string
  default = "production"
}
