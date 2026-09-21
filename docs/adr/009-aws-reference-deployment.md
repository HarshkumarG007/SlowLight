# ADR-009: AWS Reference Deployment Architecture

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-09), Spec 08 §8.2, Spec 09, Spec 29

## Context & Problem Statement
We need an infrastructure deployment model that offers:
1. Enterprise-grade security and isolation.
2. Comprehensive, tamper-resistant audit logging.
3. Envelope encryption with hardware-backed Customer Managed Keys (KMS).
4. Predictable, low-cost operations within personal budget parameters (Doc 00 A-09).
5. Strong boundaries between public ingress, application logic, and data storage.

Multi-cloud or serverless sprawl across dozens of niche providers (e.g., Vercel + Supabase + Upstash + Cloudflare) fragments IAM policies, scatters audit trails, and expands the vendor supply-chain trust perimeter.

## Decision
We select an **AWS Reference Deployment Architecture** managed via **Terraform**:
- **Edge**: CloudFront + AWS WAFv2 (geo allow-list, rate limits, Admin Door block).
- **Frontend Storage**: S3 bucket (private, OAC-only) for static SPA assets.
- **Compute**: ECS Fargate (Linux container, private VPC subnets) running Fastify behind an internal Application Load Balancer (ALB reachable only from CloudFront VPC origin).
- **Database**: Amazon RDS PostgreSQL (Multi-AZ option or single-AZ with automated snapshots, private subnets, IAM authentication via `@aws-sdk/rds-signer`).
- **Storage & KMS**: Dedicated private S3 buckets (`media`, `quarantine`, `vault`, `logs`) encrypted with distinct KMS CMKs.
- **Jobs**: Heavy media jobs run as isolated on-demand ECS Fargate tasks (`ecs:RunTask`), queued via `pg-boss` within RDS.

## Rationale
1. **Unified Security Plane**: A single cloud provider ensures consistent IAM policies, unified CloudTrail audit logging, and uniform KMS encryption boundaries.
2. **No Public Database or Compute Ingress**: ALB and RDS reside entirely inside private VPC subnets with zero public IP exposure; ingress is strictly routed through CloudFront with WAF inspection.
3. **No Host Management**: ECS Fargate removes the operational burden of OS-level patch management and host hardening.
4. **Cost Efficiency**: Fits comfortably within tens of USD per month for a two-user private sanctuary.

## Consequences
- **Positive**: Cohesive security architecture; verifiable infrastructure-as-code; hardened network boundaries.
- **Negative / Trade-off**: AWS-specific configuration (abstracted via clean Terraform modules).
