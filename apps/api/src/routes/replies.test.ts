import { describe, it, expect, beforeAll, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { repliesRoutes } from './replies.routes.js';
import { setKeyRingForTesting } from '../crypto/keyring.js';
import { seal, unseal, type KeyRing } from '../crypto/sealed.js';
import { getKeyRing } from '../crypto/keyring.js';

interface StoredReply {
  id: string;
  userId: string;
  targetType: 'memory' | 'letter';
  targetId: string;
  bodySealed: string;
  createdAt: Date;
}

const mockStoredReplies: StoredReply[] = [];

vi.mock('../db/index.js', () => ({
  withActor: vi.fn(async (_role: string, _userId: string, callback: (tx: unknown) => Promise<unknown>) => {
    const mockTx = {
      insert: vi.fn(() => ({
        values: vi.fn(async (val: Omit<StoredReply, 'createdAt'>) => {
          const row: StoredReply = { ...val, createdAt: new Date() };
          mockStoredReplies.push(row);
          return [row];
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => mockStoredReplies),
          })),
        })),
      })),
    };
    return callback(mockTx);
  }),
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
  },
}));

describe('Replies API & Encryption (T12.1)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Inject mock KeyRing for testing without hitting live KMS or DB
    const mockRing: KeyRing = {
      activeKid: 'unit-test-dek',
      key: () => Buffer.alloc(32, 9),
    };
    setKeyRingForTesting(mockRing);

    app = fastify();
    await app.register(cookie);
    await app.register(repliesRoutes);
    await app.ready();
  });

  it('rejects invalid inputs on POST /api/v1/replies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/replies',
      payload: {
        targetType: 'invalid-type',
        targetId: 'not-a-uuid',
        content: '',
      },
    });

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.body) as { error: string };
    expect(json.error).toBe('Invalid input');
  });

  it('successfully posts a sealed reply and returns 201', async () => {
    const memoryId = '11111111-2222-3333-4444-555555555555';
    const whisper = 'This quiet moment meant everything to me.';

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/replies',
      payload: {
        targetType: 'memory',
        targetId: memoryId,
        content: whisper,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.body) as {
      success: boolean;
      data: { id: string; targetType: string; targetId: string };
    };

    expect(json.success).toBe(true);
    expect(json.data.targetType).toBe('memory');
    expect(json.data.targetId).toBe(memoryId);
    expect(json.data.id).toBeDefined();

    // Verify stored mock row contains ciphertext and never plaintext
    expect(mockStoredReplies.length).toBeGreaterThan(0);
    const stored = mockStoredReplies[mockStoredReplies.length - 1]!;
    expect(stored.bodySealed.startsWith('v1.')).toBe(true);
    expect(stored.bodySealed).not.toContain(whisper);
  });

  it('verifies row-bound envelope encryption for reply bodies', () => {
    const ring = getKeyRing();
    const rowId = '99999999-9999-9999-9999-999999999999';
    const plainText = 'A whisper never to be stored in cleartext.';

    const sealed = seal(
      plainText,
      {
        table: 'replies',
        column: 'body_sealed',
        rowId,
      },
      ring
    );

    // Format must be v1.<kid>.<nonce>.<ciphertext+tag>
    expect(sealed.startsWith('v1.')).toBe(true);
    // Ciphertext must NOT contain the plaintext
    expect(sealed).not.toContain(plainText);

    // Unseal with identical context works
    const unsealed = unseal(
      sealed,
      {
        table: 'replies',
        column: 'body_sealed',
        rowId,
      },
      ring
    );
    expect(unsealed).toBe(plainText);

    // Tampered rowId (row-bound AAD mismatch) must fail
    expect(() =>
      unseal(
        sealed,
        {
          table: 'replies',
          column: 'body_sealed',
          rowId: '88888888-8888-8888-8888-888888888888',
        },
        ring
      )
    ).toThrow();
  });

  it('retrieves unsealed replies via GET /api/v1/replies', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/replies?targetType=memory',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body) as {
      success: boolean;
      data: Array<{ id: string; content: string }>;
    };
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]!.content).toBe('This quiet moment meant everything to me.');
  });
});
