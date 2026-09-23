/**
 * KeyRing: loads and holds Data Encryption Keys (DEKs) in process memory.
 *
 * Boot sequence:
 *  1. Read all active/retired rows from key_registry.
 *  2. For each row, call the key service to decrypt the wrapped_dek.
 *  3. Hold raw 32-byte DEKs in memory — never written to disk or logs.
 *  4. Fail the readiness probe if the active DEK cannot be unwrapped.
 *
 * Why in-memory only: the KMS CMK is the trust root. Caching the unwrapped
 * DEK avoids KMS latency per request while keeping the blast radius to the
 * process lifetime. A restart re-fetches from KMS.
 */
import { db } from '../db/index.js';
import { keyRegistry } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../observability/logger.js';
import type { KeyRing } from './sealed.js';

export type KeyService = {
  /** Unwrap a wrapped DEK blob → 32-byte raw key. */
  decrypt(wrappedDek: Buffer, kmsKeyId: string, kid: string): Promise<Buffer>;
};

class BootKeyRing implements KeyRing {
  private readonly keys = new Map<string, Buffer>();
  activeKid: string = '';

  load(kid: string, raw: Buffer, isActive: boolean) {
    if (raw.length !== 32) throw new Error(`DEK for kid=${kid} is not 32 bytes`);
    this.keys.set(kid, raw);
    if (isActive) this.activeKid = kid;
  }

  key(kid: string): Buffer {
    const k = this.keys.get(kid);
    if (!k) throw new Error(`KEY_RING_MISS: kid=${kid}`);
    return k;
  }
}

let _ring: BootKeyRing | null = null;

export async function buildKeyRing(svc: KeyService): Promise<KeyRing> {
  const ring = new BootKeyRing();

  const rows = await db
    .select()
    .from(keyRegistry)
    .where(eq(keyRegistry.purpose, 'sealed'));

  if (rows.length === 0) {
    throw new Error('KEY_RING_EMPTY: no keys found in key_registry for purpose=sealed');
  }

  let hasActive = false;
  for (const row of rows) {
    const raw = await svc.decrypt(row.wrappedDek as Buffer, row.kmsKeyId, row.kid);
    ring.load(row.kid, raw, row.status === 'active');
    if (row.status === 'active') hasActive = true;
    logger.info({ kid: row.kid, status: row.status }, 'key-ring: loaded DEK');
  }

  if (!hasActive) {
    throw new Error('KEY_RING_NO_ACTIVE: no active DEK — cannot seal new data');
  }

  logger.info({ activeKid: ring.activeKid, total: rows.length }, 'key-ring: ready');
  _ring = ring;
  return ring;
}

/** Returns the singleton ring after boot. Throws if called before buildKeyRing(). */
export function getKeyRing(): KeyRing {
  if (!_ring) throw new Error('KEY_RING_NOT_INITIALIZED: call buildKeyRing() at startup');
  return _ring;
}

/** Injects an in-memory key ring for unit test isolation. */
export function setKeyRingForTesting(ring: KeyRing): void {
  _ring = ring as unknown as BootKeyRing;
}

