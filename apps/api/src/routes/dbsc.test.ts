import { describe, it, expect, beforeAll, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import crypto from 'node:crypto';
import { dbscRoutes } from './dbsc.routes.js';
import type { JWKECKey } from '../auth/dbsc.js';

interface DeviceSessionRecord {
  id: string;
  sessionId: string;
  devicePublicKey: string;
  algorithm: string;
  lastProofAt: Date;
  createdAt: Date;
}

const mockDeviceSessions: DeviceSessionRecord[] = [];

// Mock DB
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async (clause?: { right?: { value?: string }; value?: string }) => {
          const val = clause?.right?.value ?? clause?.value;
          if (val !== undefined) {
            return mockDeviceSessions.filter((d) => d.sessionId === val);
          }
          return mockDeviceSessions;
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (val: Record<string, unknown>) => {
        const row = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          ...val,
        } as DeviceSessionRecord;
        mockDeviceSessions.push(row);
        return [row];
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((updateVals: Partial<DeviceSessionRecord>) => ({
        where: vi.fn(async (clause?: { right?: { value?: string }; value?: string }) => {
          const val = clause?.right?.value ?? clause?.value;
          for (const item of mockDeviceSessions) {
            if (!val || item.sessionId === val) {
              Object.assign(item, updateVals);
            }
          }
          return mockDeviceSessions;
        }),
      })),
    })),
  },
}));

// Mock sessions.js to authenticate test cookie
const validTestSession = {
  id: '00000000-0000-0000-0000-111111111111',
  userId: 'user-dbsc-test',
  idleExpiresAt: new Date(Date.now() + 3600_000),
  absoluteExpiresAt: new Date(Date.now() + 86400_000),
};

vi.mock('../auth/sessions.js', () => ({
  verifySession: vi.fn(async (token: string) => {
    if (token === 'valid-test-session-token') {
      return validTestSession;
    }
    return null;
  }),
}));

describe('DBSC Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(cookie);
    await app.register(dbscRoutes);
    await app.ready();
  });

  const validCookie = '__Host-sl_sid=valid-test-session-token';

  it('rejects POST /api/auth/dbsc/challenge when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/dbsc/challenge',
    });
    expect(res.statusCode).toBe(401);
  });

  it('generates a fresh challenge on POST /api/auth/dbsc/challenge when authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/dbsc/challenge',
      headers: {
        cookie: validCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { challenge: string };
    expect(body.challenge).toBeDefined();
    expect(typeof body.challenge).toBe('string');
  });

  it('returns bound: false on GET /api/auth/dbsc/status before registration', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/dbsc/status',
      headers: {
        cookie: validCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { sessionId: string; bound: boolean };
    expect(body.sessionId).toBe(validTestSession.id);
    expect(body.bound).toBe(false);
  });

  it('rejects POST /api/auth/dbsc/register on malformed payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/dbsc/register',
      headers: {
        cookie: validCookie,
      },
      payload: {
        jwk: { kty: 'RSA' }, // invalid kty for P-256
        signature: 'abc',
        challenge: '123',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('registers device key on POST /api/auth/dbsc/register with valid signed challenge', async () => {
    // 1. Get challenge
    const challengeRes = await app.inject({
      method: 'POST',
      url: '/api/auth/dbsc/challenge',
      headers: {
        cookie: validCookie,
      },
    });
    const { challenge } = JSON.parse(challengeRes.body) as { challenge: string };

    // 2. Generate client keypair & sign challenge
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JWKECKey;

    const signer = crypto.createSign('SHA256');
    signer.update(challenge);
    const signature = signer.sign({
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');

    // 3. Register
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/dbsc/register',
      headers: {
        cookie: validCookie,
      },
      payload: {
        jwk,
        signature,
        challenge,
      },
    });

    expect(regRes.statusCode).toBe(200);
    const regBody = JSON.parse(regRes.body) as { success: boolean; bound: boolean };
    expect(regBody.success).toBe(true);
    expect(regBody.bound).toBe(true);

    // 4. Verify status now reports bound: true
    const statusRes = await app.inject({
      method: 'GET',
      url: '/api/auth/dbsc/status',
      headers: {
        cookie: validCookie,
      },
    });

    expect(statusRes.statusCode).toBe(200);
    const statusBody = JSON.parse(statusRes.body) as { bound: boolean };
    expect(statusBody.bound).toBe(true);
  });
});
