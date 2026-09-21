import { db } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function createSession(userId: string, credentialId: string, uaSummary: string, ipPrefix: string) {
  const token = crypto.randomBytes(32);
  const tokenHash = crypto.createHash('sha256').update(token).digest();
  
  const now = new Date();
  const idleExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
  const absoluteExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId,
    credentialId,
    tokenHash,
    kind: 'standard',
    idleExpiresAt,
    absoluteExpiresAt,
    uaSummary,
    ipPrefix
  });

  return token.toString('base64url');
}

export async function verifySession(tokenBase64: string) {
  const tokenBytes = Buffer.from(tokenBase64, 'base64url');
  const tokenHash = crypto.createHash('sha256').update(tokenBytes).digest();
  
  const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash));
  
  if (!session) return null;
  if (session.revokedAt) return null;
  const now = new Date();
  if (now > session.idleExpiresAt || now > session.absoluteExpiresAt) return null;

  return session;
}
