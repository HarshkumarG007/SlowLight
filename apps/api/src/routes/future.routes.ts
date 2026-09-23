import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor } from '../db/index.js';
import { futureEntries } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import z from 'zod';

const paramSchema = z.object({ id: z.string().uuid() });

export async function futureRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'GET',
    url: '/future',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        return tx.select().from(futureEntries);
      });

      return reply.send({ success: true, data: result });
    }
  });

  createSecureRoute(app, {
    method: 'GET',
    url: '/future/:id',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const { id } = paramSchema.parse(request.params);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        const list = await tx.select().from(futureEntries).where(eq(futureEntries.id, id)).limit(1);
        return list[0] || null;
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      return reply.send({ success: true, data: result });
    }
  });
}
