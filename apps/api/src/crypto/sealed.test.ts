/**
 * sealed.test.ts — 100% branch coverage for the seal/unseal primitives.
 *
 * Tests per spec AUTH-12 / SEC-09 / Doc 27:
 *  1. Round-trip: seal then unseal returns the original string.
 *  2. Wrong kid: key(kid) throws → unseal propagates error.
 *  3. Tampered ciphertext: GCM auth tag fails → unseal throws.
 *  4. AAD swap (table): moving a ciphertext to a different table/column/row fails.
 *  5. AAD swap (rowId): same ciphertext, different rowId → fails.
 *  6. Truncated body: body shorter than 16 bytes → SEALED_FORMAT error.
 *  7. Bad version prefix → SEALED_FORMAT error.
 *  8. Empty string round-trips correctly.
 *  9. Unicode payload round-trips correctly.
 */
import { describe, it, expect } from 'vitest';
import { seal, unseal } from './sealed.js';
import type { KeyRing, SealContext } from './sealed.js';
import { randomBytes } from 'node:crypto';

// Minimal in-memory KeyRing for testing
function makeRing(activeKid: string, keys: Record<string, Buffer>): KeyRing {
  return {
    activeKid,
    key(kid: string): Buffer {
      const k = keys[kid];
      if (!k) throw new Error(`KEY_RING_MISS: kid=${kid}`);
      return k;
    },
  };
}

const DEK = randomBytes(32);
const ring = makeRing('test-kid-1', { 'test-kid-1': DEK });

const ctx: SealContext = {
  table: 'memories',
  column: 'story_sealed',
  rowId: '00000000-0000-0000-0000-000000000001',
};

describe('seal / unseal', () => {
  it('round-trips a regular ASCII string', () => {
    const plain = 'Hello, slow light.';
    expect(unseal(seal(plain, ctx, ring), ctx, ring)).toBe(plain);
  });

  it('round-trips an empty string', () => {
    const plain = '';
    expect(unseal(seal(plain, ctx, ring), ctx, ring)).toBe(plain);
  });

  it('round-trips a unicode payload', () => {
    const plain = '✨ 永远 💙 αβγδ';
    expect(unseal(seal(plain, ctx, ring), ctx, ring)).toBe(plain);
  });

  it('produces a v1 dot-delimited format', () => {
    const result = seal('test', ctx, ring);
    const parts = result.split('.');
    expect(parts[0]).toBe('v1');
    expect(parts).toHaveLength(4);
  });

  it('each seal call produces a unique ciphertext (random nonce)', () => {
    const a = seal('same', ctx, ring);
    const b = seal('same', ctx, ring);
    expect(a).not.toBe(b);
  });

  it('throws KEY_RING_MISS when the kid is unknown', () => {
    const sealed = seal('secret', ctx, ring);
    // Modify the kid to something the ring does not know
    const parts = sealed.split('.');
    parts[1] = 'unknown-kid';
    const tampered = parts.join('.');
    expect(() => unseal(tampered, ctx, ring)).toThrow('KEY_RING_MISS');
  });

  it('throws on tampered ciphertext (GCM auth tag mismatch)', () => {
    const sealed = seal('secret', ctx, ring);
    const parts = sealed.split('.');
    // Flip the last byte of the ciphertext+tag blob
    const bodyBuf = Buffer.from(parts[3] as string, 'base64url');
    const lastIdx = bodyBuf.length - 1;
    if (lastIdx >= 0) bodyBuf[lastIdx] = (bodyBuf[lastIdx] ?? 0) ^ 0xff;
    parts[3] = bodyBuf.toString('base64url');
    expect(() => unseal(parts.join('.'), ctx, ring)).toThrow();
  });

  it('throws when table in AAD is swapped (ciphertext-swapping protection)', () => {
    const sealed = seal('secret', ctx, ring);
    const wrongCtx: SealContext = { ...ctx, table: 'letters' };
    expect(() => unseal(sealed, wrongCtx, ring)).toThrow();
  });

  it('throws when column in AAD is swapped', () => {
    const sealed = seal('secret', ctx, ring);
    const wrongCtx: SealContext = { ...ctx, column: 'other_column' };
    expect(() => unseal(sealed, wrongCtx, ring)).toThrow();
  });

  it('throws when rowId in AAD is swapped', () => {
    const sealed = seal('secret', ctx, ring);
    const wrongCtx: SealContext = {
      ...ctx,
      rowId: '00000000-0000-0000-0000-000000000002',
    };
    expect(() => unseal(sealed, wrongCtx, ring)).toThrow();
  });

  it('throws SEALED_FORMAT on bad version prefix', () => {
    const sealed = seal('secret', ctx, ring);
    const badVersion = 'v2' + sealed.slice(2);
    expect(() => unseal(badVersion, ctx, ring)).toThrow('SEALED_FORMAT');
  });

  it('throws SEALED_FORMAT when body is truncated (< 16 bytes for auth tag)', () => {
    // Construct a manually malformed sealed string
    const parts = ['v1', 'test-kid-1', randomBytes(12).toString('base64url'), 'short'];
    expect(() => unseal(parts.join('.'), ctx, ring)).toThrow('SEALED_FORMAT');
  });

  it('throws SEALED_FORMAT when field count is wrong', () => {
    expect(() => unseal('v1.kid.nonce', ctx, ring)).toThrow('SEALED_FORMAT');
  });
});
