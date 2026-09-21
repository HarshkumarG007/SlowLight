# ADR-006: Sealed Text Fields via AES-256-GCM and KMS Envelope Encryption

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-06), Spec 08 §8.2, Spec 10 §10.6

## Context & Problem Statement
Slow Light stores deeply personal text: memories, stories, love letters, captions, location names, and future promises. If a database backup, replication stream, RDS snapshot, or accidental SQL dump is compromised, intimate prose must not be readable as plaintext.

## Decision
We implement **Application-Layer Envelope Encryption ("Sealed Fields")** for all intimate text columns (`story_sealed`, `letter_body_sealed`, `caption_sealed`, `location_name_sealed`, `alt_text_sealed`, `site_text_sealed`).

- **Primitive**: AES-256-GCM with a 96-bit cryptographically secure random nonce.
- **Row-Bound AAD**: Additional Authenticated Data bound to table name, column name, row ID, and key ID (`sl:v1|table|column|rowId|kid`), preventing ciphertext-transplantation attacks.
- **Envelope Hierarchy**: An AWS KMS Customer Managed Key (CMK `alias/sl-sealed`) wraps Data Encryption Keys (DEKs) stored in `key_registry`. Unwrapped DEKs reside exclusively in process memory in the API service.
- **Fail-Closed Boot**: The API server fails readiness probes if the active DEK cannot be unwrapped from KMS at boot.

## Rationale
1. **Protection of Backups and Dumps**: Any leaked PostgreSQL snapshot or SQL export contains only encrypted ciphertext strings (`v1.<kid>.<nonce>.<ct||tag>`).
2. **Deterministic Cryptographic Guarantees**: AAD binding ensures that ciphertext from one memory cannot be moved to another row or table.
3. **Honest Threat Modeling**: A compromised API task memory can decrypt sealed fields (as it must to serve legitimate users), but a static database leak or storage compromise cannot.

## Consequences
- **Positive**: Complete confidentiality of sensitive text in backups and database dumps; transparent key rotation mechanism.
- **Negative / Trade-off**: Full-text search cannot be executed directly via SQL `LIKE` or tsvector on encrypted columns (mitigated by an in-memory decrypted search cache in the API, acceptable under A-02 scale).
