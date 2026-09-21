# 33 — PRIVACY AUDIT

| Data | Personal/sensitive? | Collected by | Necessary? | Minimization applied | Third party sees? |
|---|---|---|---|---|---|
| Stories, letters, captions, media | Sensitive | Author input | Yes (purpose) | Sealed/KMS, signed URLs, EXIF stripped | AWS as processor (ciphertext at rest; plaintext in transit/memory) |
| Titles, dates, tags | Personal | Author | Yes | Advised to stay evocative | AWS |
| Location | Sensitive | Author (optional) | No (optional) | Label only, city precision default, sealed, no map | AWS |
| Timestamps/`captured_at` | Metadata | Worker (from files) | No | Admin-only, never sent to Recipient | AWS |
| Device info | Identifier | Browser | Partly | UA family only; passkey label user-chosen | — |
| IP address | Personal | Edge | Security | /24 (/48) prefix in DB; full IP only in WAF logs 14 d | AWS |
| Auth data | Sensitive | Server | Yes | Public keys and hashes only; no passwords; no email for Recipient | — |
| Analytics | — | **None** | — | Not collected | — |
| Fonts/scripts | — | Self-hosted | — | No third-party requests | — |
| Recipient behavior | Sensitive | Not collected except `opened_at`, `last_seen_world_at` | Minimal | Not exposed to Author; shown to her | — |
Findings: (1) Backups outlive deletions — documented. (2) Passkey provider is outside our control — documented to the Recipient. (3) CT/DNS metadata — wildcard, neutral naming. (4) Author's alert email is stored sealed and used only for security alerts. **Open items:** decide retention for audit (2 y default); confirm consent conversation with the Recipient about what the Author can and cannot see (the design supports transparency).
