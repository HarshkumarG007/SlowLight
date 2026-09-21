# ADR-011: Zero Analytics, Zero Third-Party Requests, and Self-Hosted Assets

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-11), Spec 08 §8.2, Spec 10 §10.3, Spec 12

## Context & Problem Statement
Modern web applications routinely embed third-party services: Google Analytics, Sentry, Mixpanel, Google Fonts, CDNs, tag managers, and social widgets. Each external request:
1. Leaks user IP addresses, visit timestamps, device telemetry, and referrer headers to third-party corporations.
2. Creates supply-chain attack vectors (malicious script injection via compromised CDN vendors).
3. Weakens the Content Security Policy (`script-src`, `connect-src`).

In a romantic sanctuary intended exclusively for two people, third-party observation is completely unacceptable.

## Decision
1. **Zero External Requests**: The application makes **zero network requests to any third-party origin**.
2. **Self-Hosted Assets**: All typography (fonts), audio samples, icons, and libraries are strictly self-hosted and bundled with the static application assets.
3. **No Client-Side Analytics or Telemetry**: No tracking pixels, analytics scripts, error-reporting SaaS trackers, or session recording tools (e.g., Hotjar, FullStory) are permitted.
4. **Ironclad CSP**: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'`.
5. **Continuous Verification**: Automated Playwright end-to-end tests enforce a network request allow-list; any outbound request to a domain other than the application origin fails the test suite immediately (Acceptance Criterion PRIV-01).

## Rationale
1. **Total Privacy Guarantee**: Neither Google, Apple, cloud CDNs, nor any third party can track when the Recipient logs in, how long they read, or what memories they view.
2. **Deterministic Security**: Eliminates XSS and supply-chain compromises via third-party script CDN takeovers.

## Consequences
- **Positive**: Uncompromising privacy; rock-solid CSP; zero external dependencies at runtime.
- **Negative / Trade-off**: Fonts and static media must be packaged locally; server errors must be monitored through first-party CloudWatch logs rather than third-party SaaS dashboards.
