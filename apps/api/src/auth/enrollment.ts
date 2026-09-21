import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { db } from '../db/index.js';
import { credentials, authChallenges, enrollmentInvites } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../config/env.js';
import { createSession } from './sessions.js';

const RP_ID = env.NODE_ENV === 'production' ? 'slowlight.app' : 'localhost';
const ORIGIN = env.NODE_ENV === 'production' ? 'https://slowlight.app' : 'http://localhost:5173';

export async function beginEnrollment(token: string, phrase: string) {
  const tokenHash = crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest();
  
  const [invite] = await db.select().from(enrollmentInvites).where(eq(enrollmentInvites.tokenHash, tokenHash));
  
  if (!invite) throw new Error('Invalid invite');
  if (invite.consumedAt) throw new Error('Invite already consumed');
  if (new Date() > invite.expiresAt) throw new Error('Invite expired');
  if (invite.attempts >= 5) throw new Error('Too many attempts');

  await db.update(enrollmentInvites).set({ attempts: invite.attempts + 1 }).where(eq(enrollmentInvites.id, invite.id));

  const phraseValid = await argon2.verify(invite.phraseHash, phrase);
  if (!phraseValid) throw new Error('Invalid phrase');

  const options = await generateRegistrationOptions({
    rpName: 'Slow Light',
    rpID: RP_ID,
    userID: new Uint8Array(Buffer.from(invite.userId)),
    userName: 'Recipient', // In passkeys discoverable credentials require a username, but we won't show it
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    attestationType: 'none',
  });

  const challengeBytes = Buffer.from(options.challenge, 'base64url');
  await db.insert(authChallenges).values({
    purpose: 'enroll',
    userId: invite.userId,
    challenge: challengeBytes,
    expiresAt: new Date(Date.now() + 120 * 1000)
  });

  return options;
}

export async function completeEnrollment(token: string, body: RegistrationResponseJSON, uaSummary: string, ipPrefix: string) {
  const tokenHash = crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest();
  const [invite] = await db.select().from(enrollmentInvites).where(eq(enrollmentInvites.tokenHash, tokenHash));
  
  if (!invite || invite.consumedAt || new Date() > invite.expiresAt) throw new Error('Invalid invite');

  const clientData = JSON.parse(Buffer.from(body.response.clientDataJSON, 'base64url').toString('utf8'));
  const challengeBytes = Buffer.from(clientData.challenge, 'base64url');
  
  const [challengeRow] = await db.select().from(authChallenges).where(eq(authChallenges.challenge, challengeBytes));
  if (!challengeRow || challengeRow.purpose !== 'enroll' || challengeRow.consumedAt || new Date() > challengeRow.expiresAt) {
    throw new Error('Invalid challenge');
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: clientData.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Atomically consume invite
    const result = await db.update(enrollmentInvites)
      .set({ consumedAt: new Date() })
      .where(and(eq(enrollmentInvites.id, invite.id), isNull(enrollmentInvites.consumedAt)))
      .returning();

    if (result.length === 0) throw new Error('Failed to consume invite');

    await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challengeRow.id));

    const [newCred] = await db.insert(credentials).values({
      userId: invite.userId,
      credentialId: Buffer.from(credentialID),
      publicKey: Buffer.from(credentialPublicKey),
      signCount: counter,
      transports: body.response.transports || []
    }).returning();

    return await createSession(invite.userId, newCred.id, uaSummary, ipPrefix);
  } else {
    throw new Error('Not verified');
  }
}
