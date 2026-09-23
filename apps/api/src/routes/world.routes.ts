import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor } from '../db/index.js';
import { chapters, memories, letters, futureEntries, userState } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export async function worldRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'GET',
    url: '/world',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      // Mock session extraction
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        // RLS guarantees we only see published/visible rows
        const chaps = await tx.select().from(chapters).orderBy(asc(chapters.sortOrder));
        const mems = await tx.select({
          id: memories.id,
          chapterId: memories.chapterId,
          title: memories.title,
          occurredOn: memories.occurredOn,
          datePrecision: memories.datePrecision,
          kind: memories.kind,
          significance: memories.significance,
          emotion: memories.emotion,
          // Asset counts and covers would typically be aggregated here or fetched in a subquery
        }).from(memories).orderBy(asc(memories.occurredOn));
        
        const lets = await tx.select({
          id: letters.id,
          title: letters.title,
          unlockMode: letters.unlockMode,
          unlockAt: letters.unlockAt,
          sealCeremony: letters.sealCeremony,
          openedAt: letters.openedAt,
        }).from(letters);
        
        const futures = await tx.select().from(futureEntries);

        return {
          worldSeed: 'b3f1...', // stub
          frontierAt: '2026-08-01', // stub
          newSince: [],
          texts: {},
          chapters: chaps,
          memories: mems,
          letters: lets,
          future: futures,
        };
      });

      return reply.send({ success: true, data: result });
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/world/seen',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };
      
      await withActor(session.role, session.userId, async (tx) => {
        await tx.update(userState).set({ lastSeenWorldAt: new Date() }).where(eq(userState.userId, session.userId));
      });

      return reply.send({ success: true });
    }
  });
}
