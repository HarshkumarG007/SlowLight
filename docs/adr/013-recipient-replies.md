# ADR-013 — Recipient Replies

**Status:** Accepted  
**Date:** 2026-09-23  
**Deciders:** Author  

---

## Context

Phase 12 optional extension T12.1. Currently, Slow Light is a one-way experience: the Author creates and publishes, the Recipient reads. Adding Recipient replies creates a bidirectional, private conversation layer where the Recipient can leave thoughts or reflections attached to memories or letters.

## Decision Drivers

- Must strictly adhere to the "no read receipts anywhere" rule (UX-10). The Recipient is never told if or when the Author opened their reply.
- Replies must be sealed (AES-256-GCM envelope encryption with row-bound AAD) before database storage, matching ADR-006.
- Recipient activity must not leak through telemetry, unsealed logs, or third parties (PRIV-04).
- The feature must remain emotionally intimate, understated, and respectful of the dark/ambient museum aesthetic.

## Considered Options

1. **Full sealed reply interface** — Recipient composes text thoughts (up to 5,000 characters) that are sealed on ingestion and viewable by the Author in the admin portal.
2. **Reaction-only** — Simple emoji or celestial bookmark reactions without written text.
3. **No replies** — Retain pure read-only experience.

## Decision

**Adopt Option 1 — Full sealed reply interface.**

### Architecture & Controls
1. **Drizzle Schema**: Table `replies` (`id`, `userId`, `targetType`, `targetId`, `bodySealed`, `createdAt`).
2. **Encryption**: AES-256-GCM envelope encryption with AAD bound to `sl:v1|replies|body_sealed|<rowId>|<kid>`. Plaintext exists only in process memory during composition and authorized unsealing.
3. **API Routes**:
   - `POST /api/v1/replies`: authenticated recipient submits note. Server validates, seals, and inserts via `withActor()`.
   - `GET /api/v1/replies`: recipient reads their own replies; author reads unsealed replies across memories/letters.
4. **UI Components**:
   - Recipient: `ReplyComposer.tsx` embedded gracefully at the end of `MemoryPanel` and `LetterViewer`.
   - Author: `RepliesViewer.tsx` in the Admin SPA to read received thoughts.
5. **No Read Receipts**: No `read_at` or `viewed_at` timestamps are exposed to the client.

## Consequences

- **Positive**: Emotional depth and reciprocity increase significantly.
- **Security**: Content remains secure at rest (protected against database snapshot leaks).
- **Privacy**: No tracking or delivery indicators preserve the pressure-free sanctuary feel.
