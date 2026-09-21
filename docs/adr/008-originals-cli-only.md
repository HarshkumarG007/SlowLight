# ADR-008: Original Media Stored in Vault, Never Served by Web App (CLI Only)

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-08), Spec 08 §8.2, Spec 10 §10.6, Spec 14

## Context & Problem Statement
Original photographs and video captures taken on modern smartphones contain rich embedded metadata: precise GPS latitude/longitude coordinates, device serial numbers, exact timestamps, altitude, camera models, and uncompressed pixel details. If an API vulnerability, SSRF, or token compromise occurs, an adversary could potentially exfiltrate original media files and extract physical locations and metadata.

## Decision
1. **Sanitized Public Derivatives**: The media worker re-encodes all incoming media into standardized web variants (AVIF/WebP images, H.264/AAC videos) and completely strips all EXIF, GPS, and metadata. Only these sanitized variants are placed into the `media` bucket and served via `/_m/*`.
2. **Restricted Vault Storage**: The original uploaded file is moved directly to a dedicated `vault` S3 bucket encrypted with a separate KMS CMK (`alias/sl-vault`).
3. **IAM Decrypt Denial**: The API ECS task execution role is explicitly **denied `kms:Decrypt` permissions on `alias/sl-vault`**.
4. **Break-Glass CLI Access**: Original master media can only be retrieved by the Author via administrative CLI scripts using elevated local AWS credentials (`pnpm cli export-escrow`).

## Rationale
1. **Zero Location Leakage**: It is mathematically and architecturally impossible for a compromised API server or a client-side vulnerability to leak original GPS coordinates, because the API role cannot decrypt or read the `vault` bucket.
2. **Preservation of Archival Quality**: The Author does not lose high-resolution originals, but keeps them safely partitioned from the web-facing infrastructure.

## Consequences
- **Positive**: Complete defense against EXIF/GPS leaks even in the event of an API service compromise.
- **Negative / Trade-off**: Retrieving or restoring original masters requires CLI execution with Author credentials.
