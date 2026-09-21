# ADR-012: No End-to-End Encryption in v1 (Explicit Upgrade Path Documented)

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-12), Spec 08 §8.2, Spec 10 §10.9

## Context & Problem Statement
End-to-End Encryption (E2EE) in browser applications ensures that the server operator or host provider cannot read plaintext content even if the database and server process are fully compromised. However, browser-based E2EE introduces tremendous operational, UX, and cryptographic complexity:
1. Multi-device key synchronization without passwords.
2. High risk of catastrophic, irreversible data loss if keys or authenticators are lost.
3. Inability to perform server-side media transcoding, video chunking, or thumbnail generation without client-side heavy compute.
4. Incapacity for server-assisted search over intimate memories.

Because the Author is both the system creator and the cloud tenant, the threat model treats the cloud infrastructure as a controlled environment rather than a hostile third party.

## Decision
We deliberately **defer End-to-End Encryption in v1** in favor of:
- Application-layer Envelope Encryption (Sealed Fields via KMS CMK).
- Private S3 storage with KMS and OAC.
- Vault isolation for original master media.

An explicit upgrade architecture ("Sealed Vault v2") is designed and documented in Spec 10 §10.9 (utilizing WebAuthn PRF extension output for device key derivation, client-side re-wrapping, and chunked MSE video decryption) if the threat model ever shifts to require defense against AWS account compromise.

## Rationale
1. **Honest Engineering Over Security Theatre**: Browser E2EE that stores keys in `localStorage` or uses hardcoded keys is worse than useless; genuine browser E2EE requires complex key management that impairs the emotional, seamless experience of Slow Light.
2. **Author-Mediated Trust**: In this two-person relationship, the Author curates the sanctuary and manages the infrastructure. Protecting against database dump leaks (via Sealed Fields) and internet adversaries (via passkeys, WAF, and RLS) achieves the requisite security goals without fragile key loss risks.
3. **Preserves Core Features**: Allows efficient in-memory search over sealed text, server-side media transcoding (sharp/ffmpeg), and smooth video streaming.

## Consequences
- **Positive**: High reliability; zero risk of permanent accidental key loss; rich media transcoding and responsive search; straightforward recovery.
- **Negative / Trade-off**: A root compromise of the live AWS account or API ECS task memory could theoretically decrypt sealed fields (mitigated by ECS task isolation, IAM restrictions, and immutable CloudTrail audit trails).
