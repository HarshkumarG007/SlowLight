# ADR-007: Same-Origin CloudFront Signed Media (`/_m/*`) with Zero CDN Caching

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-07), Spec 08 §8.2, Spec 10 §10.3, Spec 14

## Context & Problem Statement
Intimate photographs and audio/video files must be transmitted securely to the client. Using foreign-origin signed URLs (such as direct `s3.amazonaws.com` presigned GET URLs) introduces major vulnerabilities:
1. Long bearer URLs leak via browser history, proxy logs, and referrers.
2. Third-party origins in URL paths confuse CSP rules.
3. Edge caches on shared CDN infrastructure might retain private personal imagery.

## Decision
All media is delivered strictly through **Same-Origin Signed URLs under the `/_m/*` path pattern** via CloudFront, backed by private S3 buckets with Origin Access Control (OAC) and SSE-KMS.

- **Minting**: Media URLs are only minted via authenticated `POST /api/v1/media/access` after verifying the user's authorization to the parent memory or letter.
- **Signing**: CloudFront Key Group signed URLs with short expiry (15–60 minutes).
- **Edge Caching**: Strictly disabled (`Cache-Control: private, no-store`). CloudFront acts as a TLS termination and signature verification gateway, never caching content.
- **Range Requests**: HTTP `Range` headers are supported for seamless video seeking.

## Rationale
1. **Single Origin**: All assets, API calls, and media share the primary application hostname, allowing an ironclad Content Security Policy without third-party domains (`img-src 'self' blob:; media-src 'self' blob:`).
2. **Signature Enforced at Edge**: Requests lacking a valid signature or expired timestamps are dropped immediately at CloudFront before reaching S3.
3. **No Foreign Bearer Leakage**: No external S3 hostnames appear anywhere in DOM attributes, network inspector logs, or bookmarks.

## Consequences
- **Positive**: Strict same-origin security boundary; CSP simplified; edge signature verification offloads the API server; zero shared CDN caching.
- **Negative / Trade-off**: Video playback and prolonged viewing sessions require periodic background signed-URL refreshing (handled by client media viewer).
