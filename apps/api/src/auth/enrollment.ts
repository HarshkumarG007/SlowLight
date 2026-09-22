import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { db } from '../db/index.js';
import { credentials, authChallenges, enrollmentInvites } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../config/env.js';
import { createSession } from './sessions.js';

const RP_ID = env.NODE_ENV === 'production' ? 'slowlight.app' : 'localhost';
const ORIGIN = env.NODE_ENV === 'production' ? 'https://slowlight.app' : 'http://localhost:5173';

export async function beginEnrollment(token: string, phrase: string) {
  const tokenHash = Buffer.from(
    crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest(),
  );

  const [invite] = await db
    .select()
    .from(enrollmentInvites)
    .where(eq(enrollmentInvites.tokenHash, tokenHash));

  if (!invite) throw new Error('Invalid invite');
  if (invite.consumedAt) throw new Error('Invite already consumed');
  if (new Date() > invite.expiresAt) throw new Error('Invite expired');
  if (invite.attempts >= 5) throw new Error('Too many attempts');

  await db
    .update(enrollmentInvites)
    .set({ attempts: invite.attempts + 1 })
    .where(eq(enrollmentInvites.id, invite.id));

  // Constant-time phrase check; throws on timing-safe comparison failure
  const phraseValid = await argon2.verify(invite.phraseHash, phrase);
  if (!phraseValid) throw new Error('Invalid phrase');

  const options = await generateRegistrationOptions({
    rpName: 'Slow Light',
    rpID: RP_ID,
    userID: new Uint8Array(Buffer.from(invite.userId.replace(/-/g, ''), 'hex')),
    userName: 'me',   // discoverable credentials require a userName; not shown to the user
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
    expiresAt: new Date(Date.now() + 120_000),
  });

  return options;
}

export async function completeEnrollment(
  token: string,
  body: RegistrationResponseJSON,
  uaSummary: string,
  ipPrefix: string,
) {
  const tokenHash = Buffer.from(
    crypto.createHash('sha256').update(Buffer.from(token, 'hex')).digest(),
  );
  const [invite] = await db
    .select()
    .from(enrollmentInvites)
    .where(eq(enrollmentInvites.tokenHash, tokenHash));

  if (!invite || invite.consumedAt || new Date() > invite.expiresAt) {
    throw new Error('Invalid invite');
  }

  // Decode the challenge from clientDataJSON to look it up
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
    challengeRow.purpose !== 'enroll' ||
    challengeRow.consumedAt ||
    new Date() > challengeRow.expiresAt
  ) {
    throw new Error('Invalid challenge');
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: clientData.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Not verified');
  }

  // v14 API: registrationInfo.credential holds id, publicKey, counter, transports
  const { credential } = verification.registrationInfo;

  // Atomically consume the invite — concurrent retries get 0 rows → fail
  const consumed = await db
    .update(enrollmentInvites)
    .set({ consumedAt: new Date() })
    .where(
      and(eq(enrollmentInvites.id, invite.id), isNull(enrollmentInvites.consumedAt)),
    )
    .returning();

  if (consumed.length === 0) throw new Error('Failed to consume invite (concurrent attempt)');

  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challengeRow.id));

  const [newCred] = await db
    .insert(credentials)
    .values({
      userId: invite.userId,
      credentialId: Buffer.from(credential.id, 'base64url'),
      publicKey: Buffer.from(credential.publicKey),
      signCount: credential.counter,
      transports: (body.response.transports ?? []) as string[],
    })
    .returning();

  if (!newCred) throw new Error('Failed to persist credential');

  return createSession(invite.userId, newCred.id, uaSummary, ipPrefix);
}
