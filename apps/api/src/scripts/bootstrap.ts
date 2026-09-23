#!/usr/bin/env node
/**
 * bootstrap.ts
 *
 * Bootstraps the Slow Light sanctuary for the first time.
 *
 * Spec §16:
 * - Creates the initial Author user record if not present.
 * - Mints a single-use initial Author enrollment invite.
 * - Displays the secure enrollment link (#t=<token>) and Diceware phrase.
 *
 * Usage:
 *   pnpm cli bootstrap
 */
import { db } from '../db/index.js';
import { users, credentials } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../observability/logger.js';
import { createInvite } from './invite-create.js';

async function main() {
  logger.info('Initiating Slow Light Author Bootstrap...');

  // 1. Check if Author is already enrolled with credentials
  const [existingAuthor] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'author'));

  if (existingAuthor) {
    const creds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, existingAuthor.id));

    if (creds.length > 0) {
      logger.info('Author account is already active with enrolled passkeys.');
      logger.info('If you need to enroll an additional device, log in to the admin panel or run `pnpm cli invite:create --role author`.');
      return;
    }
  }

  // 2. Mint initial Author enrollment invite
  logger.info('Minting first-time Author enrollment passkey invite...');
  const result = await createInvite('author');

  process.stdout.write(`\n╔════════════════════════════════════════════════════════════════════════════╗\n`);
  process.stdout.write(`║  SLOW LIGHT AUTHOR INITIAL BOOTSTRAP (Single Use, 24h TTL)                 ║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║ Open this URL in your primary browser to register your passkey:            ║\n`);
  process.stdout.write(`║                                                                            ║\n`);
  process.stdout.write(`║  ${result.inviteUrl.padEnd(72)}║\n`);
  process.stdout.write(`║                                                                            ║\n`);
  process.stdout.write(`║ Enter this phrase when prompted:                                           ║\n`);
  process.stdout.write(`║                                                                            ║\n`);
  process.stdout.write(`║  ${result.phrase.padEnd(72)}║\n`);
  process.stdout.write(`╚════════════════════════════════════════════════════════════════════════════╝\n\n`);

  logger.info('Bootstrap complete. Complete enrollment in your browser to claim the Author seat.');
}

if (process.argv[1]?.includes('bootstrap') || process.argv[1]?.includes('cli')) {
  main().catch((err) => {
    logger.error('Bootstrap failed:', err);
    process.exit(1);
  });
}
