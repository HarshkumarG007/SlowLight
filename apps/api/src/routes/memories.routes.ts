import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor, db } from '../db/index.js';
import { chapters, memories, memoryAssets, locations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import z from 'zod';

const paramSchema = z.object({ id: z.string().uuid() });

export async function memoryRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'GET',
    url: '/memories/:id',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const { id } = paramSchema.parse(request.params);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        // RLS handles visibility (W2 requires visible memory)
        const memoryList = await tx.select().from(memories).where(eq(memories.id, id)).limit(1);
        if (memoryList.length === 0) {
          return null;
        }
        
        const memory = memoryList[0]!;
        const chapterList = memory.chapterId ? await tx.select().from(chapters).where(eq(chapters.id, memory.chapterId)).limit(1) : [];
        const locationList = memory.locationId ? await tx.select().from(locations).where(eq(locations.id, memory.locationId)).limit(1) : [];
        const assets = await tx.select().from(memoryAssets).where(eq(memoryAssets.memoryId, memory.id));

        return {
          id: memory.id,
          title: memory.title,
          subtitle: memory.subtitle,
          occurredOn: memory.occurredOn,
          datePrecision: memory.datePrecision,
          story: memory.storySealed,
          chapter: chapterList[0] || null,
          location: locationList[0] || null,
          assets: assets,
          neighbors: { prev: null, next: null },
          kept: false
        };
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      return reply.send({ success: true, data: result });
    }
  });

  createSecureRoute(app, {
    method: 'GET',
    url: '/chapters/:id',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const { id } = paramSchema.parse(request.params);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        const list = await tx.select().from(chapters).where(eq(chapters.id, id)).limit(1);
        return list[0] || null;
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      }

      return reply.send({ success: true, data: result });
    }
  });
}
