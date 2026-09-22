import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor, db } from '../db/index.js';
import { letters, letterBodies, letterAssets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import z from 'zod';

const paramSchema = z.object({ id: z.string().uuid() });

export async function letterRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'GET',
    url: '/letters',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        return tx.select({
          id: letters.id,
          title: letters.title,
          unlockMode: letters.unlockMode,
          unlockAt: letters.unlockAt,
          sealCeremony: letters.sealCeremony,
          openedAt: letters.openedAt,
        }).from(letters);
      });

      return reply.send({ success: true, data: result });
    }
  });

  createSecureRoute(app, {
    method: 'GET',
    url: '/letters/:id',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const { id } = paramSchema.parse(request.params);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        const letterList = await tx.select().from(letters).where(eq(letters.id, id)).limit(1);
        if (letterList.length === 0) return null;
        
        const letter = letterList[0]!;
        
        // RLS enforces letter_unlocked for letter_bodies, so if this throws or returns empty, we handle it
        let body = null;
        try {
          const bodyList = await tx.select().from(letterBodies).where(eq(letterBodies.letterId, id)).limit(1);
          if (bodyList.length > 0) body = bodyList[0];
        } catch (e) {
          // RLS error / not unlocked
        }
        
        if (!body) {
          return { _locked: true, ...letter };
        }

        const assets = await tx.select().from(letterAssets).where(eq(letterAssets.letterId, id));

        return {
          id: letter.id,
          title: letter.title,
          body: body.bodySealed,
          assets,
        };
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      if ('_locked' in result) {
        return reply.status(423).send({ 
          success: false, 
          error: { code: 'LETTER_SEALED', message: "This letter isn't open yet.", details: { state: result.unlockMode, unlockAt: result.unlockAt } } 
        });
      }

      return reply.send({ success: true, data: result });
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/letters/:id/open',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const { id } = paramSchema.parse(request.params);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        // Will fail RLS if not recipient or letter not unlocked or seal_ceremony is false
        const list = await tx.update(letters)
          .set({ openedAt: new Date() })
          .where(eq(letters.id, id))
          .returning();
        
        return list.length > 0;
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      return reply.send({ success: true });
    }
  });
}
