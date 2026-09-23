# ADR-014 — DBSC (Device-Bound Session Credentials) Binding

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.2. DBSC is a proposed browser API (Chrome 125+) that cryptographically binds a session cookie to a specific device via a short-lived proof-of-possession key stored in the device's TPM/Secure Enclave. This prevents session cookie theft by malware or network attackers.

## Decision Drivers

- Aligns with Slow Light's "device-presence" security philosophy.
- Would upgrade the threat model from "session cookie theft → account takeover" to requiring full device compromise.
- API is still behind a flag in Chrome 125; not in Firefox/Safari as of 2026-09.
- Adds server-side complexity: need to register device public keys and validate DBSC refresh tokens.

## Considered Options

1. **Implement DBSC** — Serve `Sec-Session-Registration` challenge at login; validate device-bound tokens on every API request.
2. **Progressive enhancement** — Enable DBSC only when the browser supports it, fall back to existing session tokens.
3. **Skip** — Existing passkey + httpOnly session cookie + CSRF layers are already strong.

## Decision

**Option 3 — Skip in v1.** (Current default)

This ADR is a **stub** for when DBSC support becomes cross-browser or Author decides Chromium-only hardening is worth the complexity.

Implementing Option 2 requires:
1. Browser detection + conditional `Sec-Session-Registration` header.
2. New DB table: `device_sessions` (device public key, last refresh proof).
3. DBSC challenge/verify middleware in Fastify.
4. Human security review required.

## Consequences

- **If adopted:** Significantly hardens against session cookie theft; complexity +1 sprint.
- **If not adopted:** Current layered defenses (httpOnly + Secure + SameSite=Strict + CSRF + passkey step-up) remain effective.
