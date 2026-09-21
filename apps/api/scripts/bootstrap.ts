import { db } from '../src/db/index.js';
import { users, enrollmentInvites } from '../src/db/schema.js';
import crypto from 'crypto';
import argon2 from 'argon2';

async function bootstrap() {
  const [existing] = await db.select().from(users).limit(1);
  if (existing) {
    console.log('Database already bootstrapped.');
    process.exit(0);
  }

  const [author] = await db.insert(users).values({
    role: 'author',
    displayNameSealed: 'Author',
    status: 'active'
  }).returning();

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest();
  
  // A standard Diceware phrase would be used here. For bootstrap we use a static phrase or generate one.
  const phrase = 'slow light author bootstrap sequence';
  const phraseHash = await argon2.hash(phrase);

  await db.insert(enrollmentInvites).values({
    userId: author.id,
    tokenHash,
    phraseHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdBy: author.id
  });

  console.log('--- BOOTSTRAP SUCCESS ---');
  console.log(`Role: Author`);
  console.log(`Link: http://localhost:5173/enroll#t=${token}`);
  console.log(`Phrase: ${phrase}`);
  console.log('-------------------------');
  process.exit(0);
}

bootstrap().catch(console.error);
