import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { deviceSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// In-memory challenge store with 2-minute TTL
interface ChallengeEntry {
  challenge: string;
  expiresAt: number;
}
const challengeMap = new Map<string, ChallengeEntry>();

export function generateDBSCChallenge(sessionId: string): string {
  const challenge = crypto.randomBytes(32).toString('base64url');
  challengeMap.set(sessionId, {
    challenge,
    expiresAt: Date.now() + 120_000,
  });
  return challenge;
}

export function getActiveDBSCChallenge(sessionId: string): string | null {
  const entry = challengeMap.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    challengeMap.delete(sessionId);
    return null;
  }
  return entry.challenge;
}

export function consumeDBSCChallenge(sessionId: string, challenge: string): boolean {
  const active = getActiveDBSCChallenge(sessionId);
  if (!active || active !== challenge) {
    return false;
  }
  challengeMap.delete(sessionId);
  return true;
}

export interface JWKECKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  [key: string]: unknown;
}

/**
 * Verifies an ECDSA P-256 signature over data using a JWK public key.
 */
export function verifyES256Signature(
  data: string | Buffer,
  signatureBase64url: string,
  jwk: JWKECKey
): boolean {
  try {
    const keyObject = crypto.createPublicKey({
      key: jwk as crypto.JsonWebKey,
      format: 'jwk',
    });

    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const sigBuffer = Buffer.from(signatureBase64url, 'base64url');

    // Try IEEE-P1363 (standard WebCrypto format: r || s, 64 bytes)
    try {
      const verified = crypto.verify(
        'SHA256',
        dataBuffer,
        {
          key: keyObject,
          dsaEncoding: 'ieee-p1363',
        },
        sigBuffer
      );
      if (verified) return true;
    } catch {
      // Fall through to DER verification
    }

    // Try DER format as fallback
    return crypto.verify(
      'SHA256',
      dataBuffer,
      {
        key: keyObject,
        dsaEncoding: 'der',
      },
      sigBuffer
    );
  } catch {
    return false;
  }
}

/**
 * Register a device public key for a session.
 */
export async function registerDeviceSession(
  sessionId: string,
  jwk: JWKECKey,
  signature: string,
  challenge: string
): Promise<boolean> {
  // Validate challenge
  const validChallenge = consumeDBSCChallenge(sessionId, challenge);
  if (!validChallenge) {
    return false;
  }

  // Verify signature over the challenge
  const isValid = verifyES256Signature(challenge, signature, jwk);
  if (!isValid) {
    return false;
  }

  // Store in deviceSessions
  const jwkString = JSON.stringify(jwk);
  const existing = await db
    .select()
    .from(deviceSessions)
    .where(eq(deviceSessions.sessionId, sessionId));

  if (existing.length > 0) {
    await db
      .update(deviceSessions)
      .set({
        devicePublicKey: jwkString,
        lastProofAt: new Date(),
      })
      .where(eq(deviceSessions.sessionId, sessionId));
  } else {
    await db.insert(deviceSessions).values({
      sessionId,
      devicePublicKey: jwkString,
      algorithm: 'ES256',
      lastProofAt: new Date(),
    });
  }

  return true;
}

/**
 * Verify a device proof for an existing device-bound session.
 */
export async function verifyDeviceProof(
  sessionId: string,
  signature: string,
  challenge: string
): Promise<boolean> {
  const [device] = await db
    .select()
    .from(deviceSessions)
    .where(eq(deviceSessions.sessionId, sessionId));

  if (!device) {
    return false;
  }

  const jwk = JSON.parse(device.devicePublicKey) as JWKECKey;
  const isValid = verifyES256Signature(challenge, signature, jwk);

  if (isValid) {
    await db
      .update(deviceSessions)
      .set({ lastProofAt: new Date() })
      .where(eq(deviceSessions.sessionId, sessionId));
  }

  return isValid;
}

/**
 * Check if a session has an active hardware device binding.
 */
export async function isSessionDeviceBound(sessionId: string): Promise<boolean> {
  const [device] = await db
    .select({ id: deviceSessions.id })
    .from(deviceSessions)
    .where(eq(deviceSessions.sessionId, sessionId));

  return Boolean(device);
}
