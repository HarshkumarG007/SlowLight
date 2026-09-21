terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- VPC & Network ---
# module "network" {
#   source = "./modules/network"
# }

# --- Database ---
# module "database" {
#   source = "./modules/database"
# }

# --- Edge (CloudFront, WAF) ---
# module "edge" {
#   source = "./modules/edge"
# }

# --- Compute (Fargate) ---
# module "compute" {
#   source = "./modules/compute"
# }
