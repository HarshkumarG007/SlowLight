# ADR-010: The Admin Door (WAF IP Gate + Elevation + Isolated Subdomain)

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-10), Spec 08 §8.2, Spec 10 §10.8

## Context & Problem Statement
Administrative functions include editing memories, uploading media, managing device enrollments, creating invite codes, and deleting content. Exposing an `/admin` route or administrative API endpoints publicly on the open internet invites brute-force attacks, scanner reconnaissance, and unauthorized exploitation.

## Decision
The administration console is protected by a multi-layered barrier termed the **Admin Door**:
1. **Network Invisibility (WAF IP Gate)**: AWS WAF drops all requests to the admin hostname (`admin.<domain>`) and `/api/v1/admin/*` by default (HTTP 403 Forbidden).
2. **Dynamic Door Script**: The Author opens the door dynamically via a CLI script (`pnpm cli admin-door open --hours 4`) which adds the Author's current public IP to the AWS WAF IP set using authenticated AWS CLI / SDK credentials with MFA. The IP is automatically removed after the TTL expires or via `admin-door close`.
3. **Separate Subdomain & SPA**: The administrative interface is compiled as an independent SPA entry (`admin.html`), served on a dedicated hostname with a wildcard TLS certificate (preventing Certificate Transparency logs from leaking the admin hostname).
4. **Role & Elevation**: Requires `role=author` passkey authentication plus cryptographic step-up elevation (fresh passkey assertion within ≤ 15 minutes) for sensitive and destructive operations.

## Rationale
1. **Zero Internet Exposure**: To any port scanner or unauthorized actor on the internet, the admin endpoint literally does not exist.
2. **Immunity to Automated Scanners**: Scanners, credential-stuffing bots, and automated exploit probes are rejected at the edge before ever reaching the Fastify API or database.
3. **Two-Tier Author Protection**: Even if the Author's browser session cookie were somehow intercepted, operations fail without an open WAF IP set and fresh hardware biometric elevation.

## Consequences
- **Positive**: Exceptional defense against unauthorized discovery and exploitation; admin endpoints are completely hidden from the public internet.
- **Negative / Trade-off**: Author must run a quick CLI command to open the door before accessing the admin interface.
