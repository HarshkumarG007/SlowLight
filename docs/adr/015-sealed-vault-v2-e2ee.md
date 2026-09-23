# ADR-015 — Sealed Vault v2 (True E2EE via WebCrypto)

**Status:** Accepted  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.3. ADR-012 originally deferred client-side E2EE in v1 due to CTAP2.1 PRF extension browser variations and key loss recovery complexity. The initial baseline utilized server-side KMS envelope encryption (AES-256-GCM, row-bound AAD).

To achieve true zero-knowledge privacy for sensitive memories, letters, and whispers, content must be encrypted before leaving the client browser, such that neither the API server, database, nor cloud infrastructure ever observe cleartext or possess the decryption keys.

## Decision Drivers

- **Zero-Knowledge Confidentiality**: Eliminates server-side plaintext exposure even in memory or logs during processing.
- **Backward Compatibility**: Seamless coexistence with existing `v1.<kid>.<nonce>.<ct>` envelope data without requiring destructive bulk migrations or downtime.
- **Standard Cryptography**: Exclusively use W3C Web Cryptography API (`crypto.subtle`) with standard NIST curve P-256 (`prime256v1`), HKDF-SHA256, AES-KW (Key Wrap), and AES-256-GCM.
- **Row-Bound Anti-Swapping AAD**: Retain rowId, table, and column binding in the AEAD authentication tag to prevent ciphertext swapping between entities.
- **Hardware/Device Storage**: Non-extractable device private keys stored in IndexedDB (`sl_e2ee_vault`) across browser sessions.

## Considered Options

1. **Full PRF-Only WebAuthn Extension**: Derive encryption keys directly from passkey assertions. Rejected as sole mechanism due to incomplete mobile browser support as of 2026.
2. **Progressive WebCrypto Client-Side Envelope (Adopted)**:
   - Each client generates a device-bound ECDH P-256 keypair via `crypto.subtle`.
   - Public keys are registered on the backend via authenticated session.
   - The sender generates a random 256-bit AES-GCM Content Encryption Key (CEK) and encrypts the body in the browser.
   - An ephemeral ECDH keypair is generated to derive a Key Encryption Key (KEK) using HKDF-SHA256 and the recipient's public key.
   - The CEK is wrapped with AES-KW.
   - Envelope format: `v2.e2ee.<recipientKid>.<ephemeralPubJWK_b64url>.<iv_b64url>.<wrappedCek_b64url>.<ciphertext_b64url>`
   - The recipient browser unwraps the CEK with their device private key and decrypts the payload in the DOM.
3. **Status Quo (ADR-012 Server-Side KMS Envelope)**: Retained as fallback for non-E2EE metadata or legacy entries.

## Decision

**Adopt Option 2: Progressive WebCrypto Client-Side E2EE Envelope.**

1. `packages/shared/src/e2ee.ts` contains the pure WebCrypto cryptographic core runnable in both browser and Node.js environments.
2. `apps/api/src/db/schema.ts` adds an `e2ee_keys` table storing registered participant public JWKs.
3. `apps/api/src/routes/e2ee.routes.ts` provides `/api/auth/e2ee/keys` for key registration and retrieval.
4. `apps/web/src/lib/e2ee.ts` manages local private key generation, IndexedDB storage, and transparent decryption.
5. In `MemoryPanel.tsx` and `LetterViewer.tsx`, payloads starting with `v2.e2ee.` are decrypted client-side and rendered with an E2EE verification badge.

## Consequences

- **Security & Privacy**: Complete end-to-end secrecy for personal content. The backend server acts solely as a zero-knowledge encrypted store.
- **Performance**: High efficiency: ECDH derivation and AES-GCM encryption take < 5 ms in modern WebCrypto implementations.
- **Recovery**: Device loss requires re-registering an E2EE key for new content. Older content remains readable on any device holding that device's enrolled key.
