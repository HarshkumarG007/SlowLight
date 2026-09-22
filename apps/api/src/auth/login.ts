import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
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
    expiresAt: new Date(Date.now() + 120_000),
  });

  return options;
}

export async function verifyLogin(
  body: AuthenticationResponseJSON,
  ipPrefix: string,
  uaSummary: string,
) {
  const credentialIdBuf = Buffer.from(body.id, 'base64url');

  const [credential] = await db
    .select()
    .from(credentials)
    .where(eq(credentials.credentialId, credentialIdBuf));

  if (!credential) throw new Error('Credential not found');
  if (credential.revokedAt) throw new Error('Credential revoked');

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, credential.userId));

  if (!user || user.status !== 'active') throw new Error('User inactive');

  // Decode client data to extract and look up the challenge
  const clientData = JSON.parse(
    Buffer.from(body.response.clientDataJSON, 'base64url').toString('utf8'),
  ) as { challenge: string };
  const challengeBytes = Buffer.from(clientData.challenge, 'base64url');

  const [challengeRow] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.challenge, challengeBytes));

  if (
    !challengeRow ||
    challengeRow.purpose !== 'login' ||
    challengeRow.consumedAt ||
    new Date() > challengeRow.expiresAt
  ) {
    throw new Error('Invalid or expired challenge');
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: clientData.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
    credential: {
      id: credential.credentialId.toString('base64url'),
      publicKey: new Uint8Array(credential.publicKey as Buffer),
      counter: Number(credential.signCount),
      transports: credential.transports as any,
    },
  });

  if (!verification.verified) throw new Error('Not verified');

  // Consume challenge and update counter to detect cloning
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challengeRow.id));

  await db
    .update(credentials)
    .set({
      signCount: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(credentials.id, credential.id));

  return createSession(user.id, credential.id, uaSummary, ipPrefix);
}
