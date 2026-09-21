# ADR-004: Passkey-Only Authentication with Author-Mediated Recovery

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-04), Spec 08 §8.2, Spec 16

## Context & Problem Statement
Slow Light serves exactly two users: the Author (creator/admin) and the Recipient (viewer). Traditional authentication methods (passwords, magic links via email, SMS OTPs, social OAuth) present severe risks: credential stuffing, password reuse, email provider compromise, phishing attacks, and surveillance/metadata leaks. We must establish an authentication architecture that guarantees phishing resistance and privacy without third-party visibility.

## Decision
We implement a **Passkey-Only (WebAuthn / FIDO2)** authentication system requiring **User Verification (biometrics or device PIN)** on every login ceremony.

Passwords, magic email links, SMS OTPs, and third-party identity providers (Auth0, Clerk, Cognito) are completely excluded.

Account recovery for the Recipient is **Author-mediated**: the Author issues a fresh single-use enrollment invite (protected by an out-of-band passphrase). The Author holds offline recovery codes and CLI break-glass mechanisms.

## Rationale
1. **Phishing Resistance**: WebAuthn public-key credentials are cryptographically bound to the origin domain (RP ID). Credential phishing is technically impossible.
2. **Zero Password Database**: No password hashes (bcrypt, Argon2) are stored for authentication; a database compromise does not yield reusable credentials.
3. **No Third-Party Telemetry**: Managed auth providers (Auth0, Clerk) would log every visit timestamp and client IP, violating privacy principles.
4. **Minimal Friction with High Security**: Logging in on mobile or desktop is a single biometric touch (Face ID, Touch ID, Windows Hello).
5. **Two-User Alignment**: Because there are only two users, Author-mediated recovery is personal, secure, and eliminates automated account takeovers.

## Consequences
- **Positive**: Maximum cryptographic security; zero third-party leakage; seamless biometric UX; immune to credential stuffing.
- **Negative / Trade-off**: Recipient must have a WebAuthn-capable device (mitigated by A-06; evergreen devices support passkeys natively, hybrid QR login handles secondary computers).
