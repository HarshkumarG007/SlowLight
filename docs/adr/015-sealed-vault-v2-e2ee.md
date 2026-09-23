# ADR-015 — Sealed Vault v2 (True E2EE)

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.3. ADR-012 explicitly deferred E2EE for v1. The current architecture uses server-side KMS envelope encryption — data is protected at rest and in transit but the server CAN theoretically decrypt it during processing.

True E2EE would mean only the Recipient's device can decrypt content. The Author would encrypt content using the Recipient's public key (from their registered passkey credential) before it leaves the Author's browser.

## Decision Drivers

- Eliminates server-side plaintext exposure even to the Author's own infrastructure.
- Dramatically increases key management complexity.
- The Recipient's private key never leaves their device (WebAuthn spec).
- Key derivation from passkey to encryption key requires the `PRF` extension (`hmac-secret` on CTAP2.1 devices). Browser support is limited as of 2026.
- Loss of device = loss of decryption capability (no server-side recovery path without a backup key scheme).

## Considered Options

1. **Full E2EE via WebCrypto + PRF extension** — Author encrypts in browser using Recipient's device-derived key.
2. **Hybrid** — E2EE for bodies only; metadata remains server-encrypted.
3. **Current (ADR-012)** — Server-side KMS envelope encryption. Simple, recoverable.

## Decision

**Option 3 — Defer (ADR-012 holds).** (Current default)

This is a **stub** for a future E2EE implementation. Switching to Option 1 requires:

1. Both browsers (Author + Recipient) must support PRF extension.
2. New key agreement protocol (Author generates ephemeral key, encrypts with Recipient's PRF-derived key).
3. All `sealedText` columns get re-encrypted (migration with downtime window).
4. Recovery path (what happens if Recipient loses their only device) must be designed before implementing.
5. Substantial human security review required — this is a cryptographic architecture change.
6. Must update ADR-006 and write a new threat model document.

## Consequences

- **If adopted:** Maximum privacy guarantee. No server-side plaintext. However, recovery is significantly harder.
- **If not adopted (current):** Server-side KMS provides strong protection with simpler operations.
