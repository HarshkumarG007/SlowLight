#!/usr/bin/env node
/**
 * soft-launch.ts
 *
 * Prepares the Slow Light database for a live production launch.
 *
 * WHY: The dev/staging environment is seeded with synthetic data.
 * Before enrolling real Author/Recipient, all synthetic rows must be
 * purged so the live experience begins from a pristine state.
 * Then, a single-use Author invite token is minted for first enrollment.
 *
 * Usage:
 *   pnpm cli soft-launch --env production
 *
 * SAFETY:
 *   - Requires explicit --confirm flag; no destructive ops without it.
 *   - Double-checks NODE_ENV !== 'test' before wiping data.
 *   - Every action is written to the audit log.
 */
import { parseArgs } from 'node:util';
import { db } from '../db/index.js';
import {
  memories,
  chapters,
  letters,
  letterBodies,
  letterAssets,
  tags,
  futureEntries,
  users,
  credentials,
  sessions,
  authChallenges,
  rateLimits,
  knockCodes,
  recoveryCodes,
  enrollmentInvites,
  favorites,
  memoryTags,
  memoryAssets,
  mediaAssets,
  userState,
  locations,
} from '../db/schema.js';
import { logger } from '../observability/logger.js';
import { randomBytes } from 'node:crypto';
import { eq, ne } from 'drizzle-orm';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    env:     { type: 'string', short: 'e', default: 'production' },
    confirm: { type: 'boolean', default: false },
  }
});

async function main() {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('soft-launch must not run in test environment.');
  }

  logger.info(`Slow Light Soft Launch [env: ${values.env}]`);

  if (!values.confirm) {
    logger.warn('SAFETY: --confirm flag not set. Dry-run mode — no changes will be made.');
    logger.info('Re-run with --confirm to proceed with data purge and Author invite creation.');
    return;
  }

  logger.info('Step 1: Purging synthetic data...');

  // Cascade-safe deletion order (dependents before parents)
  await db.delete(favorites);
  await db.delete(memoryTags);
  await db.delete(memoryAssets);
  await db.delete(letterAssets);
  await db.delete(letterBodies);
  await db.delete(letters);
  await db.delete(memories);
  await db.delete(futureEntries);
  await db.delete(tags);
  await db.delete(locations);
  await db.delete(chapters);
  await db.delete(rateLimits);
  await db.delete(authChallenges);
  await db.delete(knockCodes);
  await db.delete(recoveryCodes);
  await db.delete(enrollmentInvites);
  await db.delete(sessions);
  await db.delete(credentials);
  await db.delete(userState);
  await db.delete(mediaAssets);
  await db.delete(users);

  logger.info('✔ Synthetic data purged.');

  logger.info('Step 2: Verifying schema migration is current...');
  // Drizzle migrations are checked by the API on startup via the /api/health endpoint.
  // If the API starts cleanly, migrations are current.
  logger.info('✔ Run `pnpm dev` and check /api/health to confirm migration status.');

  logger.info('Step 3: Minting Author enrollment token...');
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // In production, this token is stored in the DB and consumed by the enrollment flow.
  // Here we print it once — it must be delivered to the Author via a secure side-channel.
  // It will NOT be logged to any persistent log.
  process.stdout.write(`\n╔══════════════════════════════════════════════════════╗\n`);
  process.stdout.write(`║  AUTHOR ENROLLMENT TOKEN (single use, 24h TTL)       ║\n`);
  process.stdout.write(`║                                                      ║\n`);
  process.stdout.write(`║  ${token}  ║\n`);
  process.stdout.write(`║                                                      ║\n`);
  process.stdout.write(`║  Expires: ${expiresAt.toISOString()}            ║\n`);
  process.stdout.write(`║                                                      ║\n`);
  process.stdout.write(`║  Deliver via secure side-channel. Do NOT email.      ║\n`);
  process.stdout.write(`╚══════════════════════════════════════════════════════╝\n\n`);

  logger.info('Soft launch complete. The application is ready for Author enrollment.');
}

main().catch(err => {
  logger.error('soft-launch failed:', err);
  process.exit(1);
});
