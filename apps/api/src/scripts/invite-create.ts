#!/usr/bin/env node
/**
 * invite-create.ts
 *
 * Mints a single-use enrollment invite for the Recipient or Author.
 *
 * Spec §16:
 * - Generates 256-bit token for URL fragment (#t=<token>).
 * - Generates 5-word Diceware phrase for out-of-band delivery.
 * - Stores token_hash (SHA-256) and phrase_hash (Argon2id) in enrollment_invites.
 * - Expiry is 24 hours; attempts counter initialized to 0.
 *
 * Usage:
 *   pnpm cli invite:create [--role recipient|author] [--env development|production]
 */
import { parseArgs } from 'node:util';
import crypto, { randomBytes, randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { db } from '../db/index.js';
import { users, enrollmentInvites } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../observability/logger.js';
import { env } from '../config/env.js';

const INTIMATE_WORDS = [
  'amber', 'anchor', 'autumn', 'beacon', 'breeze', 'candle', 'cedar',
  'celestial', 'clover', 'coastal', 'compass', 'copper', 'crystal',
  'cypress', 'dawn', 'dusk', 'echo', 'ember', 'feather', 'fern',
  'flicker', 'forest', 'glimmer', 'golden', 'harbor', 'haven',
  'heather', 'horizon', 'indigo', 'island', 'jasmine', 'lantern',
  'lavender', 'lunar', 'maple', 'meadow', 'midnight', 'mirror',
  'moonlight', 'morning', 'moss', 'mountain', 'nebula', 'nectar',
  'oasis', 'ocean', 'olive', 'orchid', 'pathway', 'pebble', 'petal',
  'pine', 'quiet', 'radiance', 'river', 'saffron', 'sanctuary',
  'sapphire', 'shadow', 'shimmer', 'silver', 'solace', 'sparrow',
  'spring', 'starlight', 'stream', 'summer', 'sunset', 'twilight',
  'valley', 'velvet', 'violet', 'wander', 'willow', 'whisper', 'zenith',
];

function generateDicewarePhrase(wordCount = 5): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = randomInt(0, INTIMATE_WORDS.length);
    words.push(INTIMATE_WORDS[idx]!);
  }
  return words.join('-');
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    role: { type: 'string', short: 'r', default: 'recipient' },
    env: { type: 'string', short: 'e', default: 'development' },
  },
});

export async function createInvite(targetRole: 'author' | 'recipient') {
  // 1. Ensure target user exists in DB
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.role, targetRole));

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create pending user if not yet initialized
    const [newUser] = await db
      .insert(users)
      .values({
        role: targetRole,
        displayNameSealed: targetRole === 'author' ? 'Author' : 'Recipient',
        status: 'pending',
      })
      .returning();
    if (!newUser) throw new Error(`Failed to create ${targetRole} user record`);
    userId = newUser.id;
  }

  // 2. Generate 256-bit token & 5-word Diceware phrase
  const token = randomBytes(32).toString('hex');
  const tokenHash = Buffer.from(
    crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest(),
  );

  const phrase = generateDicewarePhrase(5);
  const phraseHash = await argon2.hash(phrase, { type: argon2.argon2id });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 3. Persist invite
  await db.insert(enrollmentInvites).values({
    userId,
    tokenHash,
    phraseHash,
    expiresAt,
    attempts: 0,
  });

  const baseUrl = env.NODE_ENV === 'production' ? 'https://slowlight.app' : 'http://localhost:5173';
  const inviteUrl = `${baseUrl}/enroll#t=${token}`;

  return {
    role: targetRole,
    userId,
    token,
    phrase,
    inviteUrl,
    expiresAt,
  };
}

async function main() {
  const role = values.role === 'author' ? 'author' : 'recipient';
  logger.info(`Minting single-use enrollment invite for role [${role}]...`);

  const result = await createInvite(role);

  process.stdout.write(`\n╔════════════════════════════════════════════════════════════════════════════╗\n`);
  process.stdout.write(`║  SLOW LIGHT SINGLE-USE ENROLLMENT INVITE (24h TTL)                         ║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║ Target Role:   ${result.role.toUpperCase().padEnd(58)}║\n`);
  process.stdout.write(`║ Expires At:    ${result.expiresAt.toISOString().padEnd(58)}║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║  ENROLLMENT LINK (Deliver via any channel):                                ║\n`);
  process.stdout.write(`║  ${result.inviteUrl.padEnd(72)}║\n`);
  process.stdout.write(`╠════════════════════════════════════════════════════════════════════════════╣\n`);
  process.stdout.write(`║  OUT-OF-BAND PHRASE (Deliver ONLY in person or via voice):                 ║\n`);
  process.stdout.write(`║  ${result.phrase.padEnd(72)}║\n`);
  process.stdout.write(`╚════════════════════════════════════════════════════════════════════════════╝\n\n`);

  logger.info('Invite created successfully. Safe to share with enrollee.');
}

// Only execute when run directly as CLI
if (process.argv[1]?.includes('invite-create') || process.argv[1]?.includes('cli')) {
  main().catch((err) => {
    logger.error('Failed to create invite:', err);
    process.exit(1);
  });
}
