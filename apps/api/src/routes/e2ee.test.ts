import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import crypto from 'node:crypto';
import { e2eeRoutes } from './e2ee.routes.js';

interface E2EEKeyRecord {
  id: string;
  userId: string;
  kid: string;
  publicKey: string;
  algorithm: string;
  createdAt: Date;
}

let mockE2EEKeys: E2EEKeyRecord[] = [];

// Mock DB
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() =>
        Object.assign(Promise.resolve(mockE2EEKeys), {
          where: vi.fn(async () => mockE2EEKeys),
        })
      ),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (val: Record<string, unknown>) => {
        const row = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          ...val,
        } as E2EEKeyRecord;
        mockE2EEKeys.push(row);
        return [row];
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((updateVals: Partial<E2EEKeyRecord>) => ({
        where: vi.fn(async () => {
          for (const item of mockE2EEKeys) {
            Object.assign(item, updateVals);
          }
          return mockE2EEKeys;
        }),
      })),
    })),
  },
}));

// Mock sessions
const validTestSession = {
  id: '00000000-0000-0000-0000-222222222222',
  userId: 'user-e2ee-author',
  idleExpiresAt: new Date(Date.now() + 3600_000),
  absoluteExpiresAt: new Date(Date.now() + 86400_000),
};

vi.mock('../auth/sessions.js', () => ({
  verifySession: vi.fn(async (token: string) => {
    if (token === 'valid-e2ee-session-token') {
      return validTestSession;
    }
    return null;
  }),
}));

describe('Sealed Vault v2 E2EE Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(cookie);
    await app.register(e2eeRoutes);
    await app.ready();
  });

  beforeEach(() => {
    mockE2EEKeys = [];
  });

  const validCookie = '__Host-sl_sid=valid-e2ee-session-token';

  it('rejects POST /api/auth/e2ee/keys when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/e2ee/keys',
      payload: {
        kid: 'test-kid',
        publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects GET /api/auth/e2ee/keys when unauthenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/e2ee/keys',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects POST /api/auth/e2ee/keys with invalid or missing JWK attributes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/e2ee/keys',
      headers: { cookie: validCookie },
      payload: {
        kid: 'test-kid',
        publicKey: { kty: 'RSA' }, // Invalid curve and kty
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('registers participant ECDH public key on POST /api/auth/e2ee/keys', async () => {
    const kid = 'author-device-kid-123';
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: 'f83OJ3D2xFmT48mlhZZojAUGNm_7L5rENuI99pcg44M',
      y: 'x_daQau3qTNm24W01b_H0n_237kLrnU0b4Wp1H44Mpc',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/e2ee/keys',
      headers: { cookie: validCookie },
      payload: {
        kid,
        publicKey: jwk,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; kid: string };
    expect(body.success).toBe(true);
    expect(body.kid).toBe(kid);

    expect(mockE2EEKeys).toHaveLength(1);
    expect(mockE2EEKeys[0]?.kid).toBe(kid);
    expect(mockE2EEKeys[0]?.userId).toBe(validTestSession.userId);
  });

  it('returns all registered public keys on GET /api/auth/e2ee/keys', async () => {
    mockE2EEKeys.push({
      id: crypto.randomUUID(),
      userId: validTestSession.userId,
      kid: 'recipient-kid-456',
      publicKey: JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x1', y: 'y1' }),
      algorithm: 'ECDH-P256',
      createdAt: new Date(),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/e2ee/keys',
      headers: { cookie: validCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      keys: Array<{ kid: string; userId: string; publicKey: { kty: string } }>;
    };
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0]?.kid).toBe('recipient-kid-456');
    expect(body.keys[0]?.publicKey.kty).toBe('EC');
  });
});
