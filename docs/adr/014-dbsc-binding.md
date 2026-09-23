# ADR-014 — DBSC (Device-Bound Session Credentials) Binding

**Status:** Accepted  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.2. DBSC is an emerging browser security standard (Chrome 125+ / W3C draft) that cryptographically binds an HTTP session cookie to a client device's hardware TPM or Secure Enclave. This eliminates session cookie hijacking via infostealer malware, disk dump theft, or token exfiltration, because stolen cookies cannot forge the hardware-bound proof-of-possession signature.

## Decision Drivers

- Enhances Slow Light's defense-in-depth posture: steals of `__Host-sl_sid` cookies become completely useless to an adversary without the physical device.
- Must not break access on platforms without native DBSC or TPM availability (Safari, Firefox, Linux CLI tools).
- Must adhere strictly to Slow Light's privacy principles (PRIV-02): the device key is an ephemeral, per-session ECDSA P-256 key pair, never a trackable hardware GUID.

## Considered Options

1. **Mandatory DBSC** — Require DBSC on all client connections. (Rejected: breaks Safari and Firefox users).
2. **Progressive Enhancement (Chosen)** — Issue `Sec-Session-Registration` challenges upon login. If the client supports DBSC or WebCrypto hardware keys, bind the session to an ECDSA P-256 device key. If bound, verify the cryptographic proof of possession. Unbound sessions remain supported via standard secure cookies.
3. **Skip** — Defer hardware binding.

## Decision

**Adopt Option 2 — Progressive Enhancement with ECDSA P-256 Device Binding.**

### Architecture & Implementation Details
1. **Database Schema**:
   - `device_sessions` table linked to `sessions.id` storing `device_public_key` (JWK format), `algorithm` (`ES256`), and `last_proof_at`.
2. **Registration Handshake**:
   - On successful login/enrollment, server emits:
     `Sec-Session-Registration: (path="/api/auth/dbsc/register"; challenge="<base64-random>")`.
   - Supported clients generate an ECDSA P-256 key pair (non-extractable where available), sign the challenge, and submit to `POST /api/auth/dbsc/register`.
3. **Enforcement & Cookie Theft Protection**:
   - For sessions with a registered device key, requests with device headers verify the cryptographic signature against the active challenge.
   - If a stolen cookie is used from an unauthorized device that cannot produce the hardware signature, requests are rejected with `401 Unauthorized`.
4. **Client Library**:
   - `apps/web/src/lib/dbsc.ts` uses WebCrypto to create keys, listen for registration headers, and sign proofs.

## Consequences

- **Positive**: Hardens against credential theft and cookie replay malware without breaking compatibility for other browsers.
- **Maintenance**: Low overhead; verified through automated unit tests simulating cookie theft and replay attacks.
