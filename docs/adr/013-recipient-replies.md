# ADR-013 — Recipient Replies

**Status:** Proposed  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.1. Currently, Slow Light is a one-way experience: the Author creates and publishes, the Recipient reads. Adding Recipient replies creates a bidirectional, private conversation layer.

## Decision Drivers

- Must not violate the "no read receipts anywhere" rule (UX-10).
- Replies must be sealed (AES-256 envelope) before storage — same scheme as existing content (ADR-006).
- Recipient activity must never be exposed to any admin endpoint (PRIV-04).
- Replies are a significant scope change — adding a new user-generated content surface.

## Considered Options

1. **Full reply UI** — Recipient composes and sends sealed text replies, visible to Author in admin.
2. **Reaction-only** — Simple emoji reactions that don't require a text composition interface.
3. **No replies (current)** — Keep the experience read-only.

## Decision

**Option 3 — No replies in v1.** (Current default)

This ADR is a **stub** for when the Author decides to add reply support. Switching to Option 1 requires:

1. New Drizzle schema table: `replies` (sealed body, memoryId, letterId FK, createdAt).
2. New API routes: `POST /replies`, `GET /replies` (author-only, returns sealed content).
3. New UI component: `ReplyComposer.tsx` — text area + seal + submit.
4. Update threat model: a second principal (Recipient) now generates content, creating SSRF/injection surface.
5. Update RLS policies.
6. Human security review required (CODEOWNERS: auth, authz, crypto).

## Consequences

- **If adopted:** 1–2 sprint effort. Recipient engagement increases, but privacy threat surface expands.
- **If not adopted:** Application remains pure one-way. Simpler security posture.
