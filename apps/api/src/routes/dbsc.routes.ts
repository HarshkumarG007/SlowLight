import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { verifySession } from '../auth/sessions.js';
import {
  generateDBSCChallenge,
  registerDeviceSession,
  isSessionDeviceBound,
  type JWKECKey,
} from '../auth/dbsc.js';
import { z } from 'zod';

const registerSchema = z.object({
  jwk: z.object({
    kty: z.literal('EC'),
    crv: z.string(),
    x: z.string(),
    y: z.string(),
  }).passthrough(),
  signature: z.string().min(1),
  challenge: z.string().min(1),
});

export async function dbscRoutes(app: FastifyInstance) {
  /**
   * Helper to verify session cookie and return session.
   */
  async function resolveSession(cookies: Record<string, string | undefined>) {
    const sid = cookies['__Host-sl_sid'];
    if (!sid) return null;
    return verifySession(sid);
  }

  /**
   * POST /api/auth/dbsc/challenge
   * Generates a fresh DBSC registration/refresh challenge for the current session.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/dbsc/challenge',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = await resolveSession(request.cookies);
      if (!session) {
        return reply.code(401).send({ error: 'Unauthorized: active session required' });
      }

      const challenge = generateDBSCChallenge(session.id);
      return reply.send({ challenge });
    },
  });

  /**
   * POST /api/auth/dbsc/register
   * Binds the session to the client device public key using signed proof.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/dbsc/register',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = await resolveSession(request.cookies);
      if (!session) {
        return reply.code(401).send({ error: 'Unauthorized: active session required' });
      }

      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid registration parameters', details: parsed.error.format() });
      }

      const { jwk, signature, challenge } = parsed.data;
      const success = await registerDeviceSession(
        session.id,
        jwk as JWKECKey,
        signature,
        challenge
      );

      if (!success) {
        return reply.code(400).send({ error: 'Device proof verification failed' });
      }

      return reply.send({
        success: true,
        bound: true,
        sessionId: session.id,
      });
    },
  });

  /**
   * GET /api/auth/dbsc/status
   * Returns whether the current session is bound to a physical device key.
   */
  createSecureRoute(app, {
    method: 'GET',
    url: '/api/auth/dbsc/status',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = await resolveSession(request.cookies);
      if (!session) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const bound = await isSessionDeviceBound(session.id);
      return reply.send({
        sessionId: session.id,
        bound,
      });
    },
  });
}
