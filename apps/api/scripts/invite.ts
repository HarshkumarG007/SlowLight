import { db } from '../src/db/index.js';
import { users, enrollmentInvites } from '../src/db/schema.js';
import crypto from 'crypto';
import argon2 from 'argon2';

async function createInvite() {
  const role = process.argv[2] === 'author' ? 'author' : 'recipient';
  
  // Find or create user
  let [user] = await db.select().from(users).where(
    // We would normally filter by role, but for recipient there is only one
    role === 'recipient' ? undefined : undefined
  ).limit(1);

  if (!user) {
    [user] = await db.insert(users).values({
      role: role as any,
      displayNameSealed: role === 'author' ? 'Author' : 'Recipient',
      status: 'active'
    }).returning();
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest();
  
  // Simplified phrase generation
  const words = ['apple', 'mountain', 'river', 'starlight', 'ocean', 'breeze', 'forest', 'echo'];
  const phrase = Array.from({ length: 5 }, () => words[crypto.randomInt(words.length)]).join(' ');
  const phraseHash = await argon2.hash(phrase);

  await db.insert(enrollmentInvites).values({
    userId: user.id,
    tokenHash,
    phraseHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdBy: user.id
  });

  console.log('--- INVITE CREATED ---');
  console.log(`Role: ${role}`);
  console.log(`Link: http://localhost:5173/enroll#t=${token}`);
  console.log(`Phrase: ${phrase}`);
  console.log('----------------------');
  process.exit(0);
}

createInvite().catch(console.error);
