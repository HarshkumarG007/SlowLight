import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor } from '../db/index.js';
import { memories } from '../db/schema.js';
import z from 'zod';

const searchSchema = z.object({
  q: z.string().optional(),
  chapter: z.string().optional(),
  kind: z.string().optional(),
  from: z.string().optional(),
  kept: z.string().optional(),
  limit: z.number().optional().default(20),
});

export async function archiveRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'GET',
    url: '/archive/search',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const query = searchSchema.parse(request.query);
      const session = { role: 'recipient', userId: '00000000-0000-0000-0000-000000000000' };

      const result = await withActor(session.role, session.userId, async (tx) => {
        const sqlQuery = tx.select().from(memories);
        
        // Very basic mock of in-memory search over sealed text
        // In reality, sealed text cannot be queried via SQL `ilike` on the server!
        // The architecture says: "in-memory search over sealed text" happens by pulling everything or using a client-side search, or a specific design for search.
        // Wait, W7 says `GET /archive/search?q=harbour`. If it's sealed, we can't search it on the server unless the server unseals it.
        // For Phase 1 we return a stubbed response.
        
        const list = await sqlQuery.limit(query.limit);
        
        return {
          items: list.map(m => ({
            id: m.id,
            title: m.title,
            occurredOn: m.occurredOn,
            snippet: { text: "...", matches: [] }
          })),
          nextCursor: null
        };
      });

      return reply.send({ success: true, data: result });
    }
  });
}
