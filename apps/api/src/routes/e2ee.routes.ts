import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { verifySession } from '../auth/sessions.js';
import { db } from '../db/index.js';
import { e2eeKeys } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const registerKeySchema = z.object({
  kid: z.string().min(1),
  publicKey: z.object({
    kty: z.literal('EC'),
    crv: z.literal('P-256'),
    x: z.string().min(1),
    y: z.string().min(1),
  }).passthrough(),
});

export async function e2eeRoutes(app: FastifyInstance) {
  /**
   * Helper to verify session cookie and return session.
   */
  async function resolveSession(cookies: Record<string, string | undefined>) {
    const sid = cookies['__Host-sl_sid'];
    if (!sid) return null;
    return verifySession(sid);
  }

  /**
   * POST /api/auth/e2ee/keys
   * Registers or updates an active user's public ECDH key for Sealed Vault v2 E2EE.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/e2ee/keys',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = await resolveSession(request.cookies);
      if (!session) {
        return reply.code(401).send({ error: 'Unauthorized: active session required' });
      }

      const parsed = registerKeySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid public key parameters',
          details: parsed.error.format(),
        });
      }

      const { kid, publicKey } = parsed.data;
      const publicKeyJson = JSON.stringify(publicKey);

      // Check if this kid already exists for this user
      const existing = await db
        .select()
        .from(e2eeKeys)
        .where(and(eq(e2eeKeys.userId, session.userId), eq(e2eeKeys.kid, kid)));

      if (existing.length > 0) {
        await db
          .update(e2eeKeys)
          .set({
            publicKey: publicKeyJson,
            createdAt: new Date(),
          })
          .where(and(eq(e2eeKeys.userId, session.userId), eq(e2eeKeys.kid, kid)));
      } else {
        await db.insert(e2eeKeys).values({
          userId: session.userId,
          kid,
          publicKey: publicKeyJson,
          algorithm: 'ECDH-P256',
        });
      }

      return reply.send({
        success: true,
        kid,
      });
    },
  });

  /**
   * GET /api/auth/e2ee/keys
   * Retrieves participant public keys for client-side E2EE encryption.
   */
  createSecureRoute(app, {
    method: 'GET',
    url: '/api/auth/e2ee/keys',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = await resolveSession(request.cookies);
      if (!session) {
        return reply.code(401).send({ error: 'Unauthorized: active session required' });
      }

      const records = await db.select().from(e2eeKeys);

      const keys = records.map((r) => {
        let parsedJwk: unknown = {};
        try {
          parsedJwk = JSON.parse(r.publicKey);
        } catch {
          // ignore corrupted json
        }
        return {
          kid: r.kid,
          userId: r.userId,
          publicKey: parsedJwk,
          algorithm: r.algorithm,
          createdAt: r.createdAt,
        };
      });

      return reply.send({ keys });
    },
  });
}
