import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { db } from '../db/index.js';
import { credentials, authChallenges, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { createSession } from './sessions.js';

const RP_ID = env.NODE_ENV === 'production' ? 'slowlight.app' : 'localhost';
const ORIGIN = env.NODE_ENV === 'production' ? 'https://slowlight.app' : 'http://localhost:5173';

export async function getLoginOptions() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
  });

  const challengeBytes = Buffer.from(options.challenge, 'base64url');
  
  await db.insert(authChallenges).values({
    purpose: 'login',
    challenge: challengeBytes,
    expiresAt: new Date(Date.now() + 120 * 1000) // 120 seconds
  });

  return options;
}

export async function verifyLogin(body: AuthenticationResponseJSON, ipPrefix: string, uaSummary: string) {
  const credentialIdBuf = Buffer.from(body.id, 'base64url');
  
  const [credential] = await db.select().from(credentials).where(eq(credentials.credentialId, credentialIdBuf));
  if (!credential) {
    throw new Error('Credential not found');
  }
  if (credential.revokedAt) {
    throw new Error('Credential revoked');
  }

  const [user] = await db.select().from(users).where(eq(users.id, credential.userId));
  if (!user || user.status !== 'active') {
    throw new Error('User inactive');
  }

  // Get challenge from DB (naive implementation, should lookup precisely or rely on state)
  // For now we'll just parse the clientDataJSON challenge and verify it exists
  const clientData = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64url').toString('utf8'));
  const challengeBytes = Buffer.from(clientData.challenge, 'base64url');
  
  const [challengeRow] = await db.select().from(authChallenges).where(eq(authChallenges.challenge, challengeBytes));
  if (!challengeRow || challengeRow.purpose !== 'login' || challengeRow.consumedAt || new Date() > challengeRow.expiresAt) {
    throw new Error('Invalid or expired challenge');
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: clientData.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      authenticator: {
        credentialID: new Uint8Array(credential.credentialId),
        credentialPublicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.signCount),
        transports: credential.transports as any,
      },
    });
  } catch (error) {
    throw new Error(`Verification failed: ${error}`);
  }

  if (verification.verified) {
    await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challengeRow.id));
    await db.update(credentials).set({ signCount: verification.authenticationInfo.newCounter, lastUsedAt: new Date() }).where(eq(credentials.id, credential.id));
    
    return await createSession(user.id, credential.id, uaSummary, ipPrefix);
  } else {
    throw new Error('Not verified');
  }
}
