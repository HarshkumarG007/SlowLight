/**
 * LocalKeyService — development-only KeyService.
 *
 * Why: KMS requires AWS credentials. In local dev we generate a random 32-byte
 * DEK, persist it base64-encoded as the wrapped_dek column (plaintext — this is
 * intentional and safe only because the DB is local Docker). On subsequent
 * starts the same DEK is read back and returned directly.
 *
 * NEVER used in production: env.NODE_ENV === 'production' → use KmsKeyService.
 */
import { randomBytes } from 'node:crypto';
import { db } from '../db/index.js';
import { keyRegistry } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../observability/logger.js';
import type { KeyService } from './keyring.js';

export const LocalKeyService: KeyService = {
  async decrypt(wrappedDek: Buffer): Promise<Buffer> {
    // In local mode wrapped_dek IS the raw DEK (stored as base64 text, passed as Buffer).
    if (wrappedDek.length === 32) return wrappedDek;
    // Stored as base64 string bytes in the column
    return Buffer.from(wrappedDek.toString('utf8'), 'base64');
  },
};

const LOCAL_KMS_KEY_ID = 'local-dev-kms-key';
const LOCAL_PURPOSE = 'sealed';

/**
 * Ensures a local dev key exists in key_registry. Creates one if absent.
 * Returns the kid for the active key.
 */
export async function ensureLocalDevKey(): Promise<void> {
  const existing = await db
    .select()
    .from(keyRegistry)
    .where(eq(keyRegistry.purpose, LOCAL_PURPOSE));

  if (existing.length > 0) {
    logger.info({ kid: existing[0]?.kid }, 'local-key-service: existing DEK found');
    return;
  }

  // Generate a fresh 32-byte DEK and store base64 as the "wrapped" form
  const rawDek = randomBytes(32);
  const kid = `local-${Date.now()}`;
  const wrappedDek = Buffer.from(rawDek.toString('base64'));

  await db.insert(keyRegistry).values({
    kid,
    purpose: LOCAL_PURPOSE,
    wrappedDek,
    kmsKeyId: LOCAL_KMS_KEY_ID,
    status: 'active',
  });

  logger.warn(
    { kid },
    'local-key-service: created new DEK — this is NOT safe for production',
  );
}
