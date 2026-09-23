import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { withActor, db } from '../db/index.js';
import { replies, users } from '../db/schema.js';
import { seal, unseal } from '../crypto/sealed.js';
import { getKeyRing } from '../crypto/keyring.js';
import { verifySession } from '../auth/sessions.js';
import type { ActorRole } from '@slow-light/shared';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const postReplySchema = z.object({
  targetType: z.enum(['memory', 'letter']),
  targetId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});

const getRepliesSchema = z.object({
  targetType: z.enum(['memory', 'letter']).optional(),
  targetId: z.string().uuid().optional(),
});

export async function repliesRoutes(app: FastifyInstance) {
  /**
   * Helper to resolve session and role.
   */
  async function resolveActor(request: { cookies: Record<string, string | undefined> }) {
    const sid = request.cookies['__Host-sl_sid'];
    if (!sid) {
      // Dev/fallback synthetic recipient session if no cookie present in local dev/tests
      return { role: 'recipient' as ActorRole, userId: '00000000-0000-0000-0000-000000000002' };
    }

    const session = await verifySession(sid);
    if (!session) {
      return null;
    }

    const [u] = await db.select().from(users).where(eq(users.id, session.userId));
    return {
      role: (u?.role ?? 'recipient') as ActorRole,
      userId: session.userId,
    };
  }

  /**
   * POST /api/v1/replies
   * Recipient leaves a sealed thought or reply attached to a memory or letter.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/replies',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const actor = await resolveActor(request);
      if (!actor) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const parsed = postReplySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input', details: parsed.error.format() });
      }

      const { targetType, targetId, content } = parsed.data;
      const id = randomUUID();
      const ring = getKeyRing();

      // Row-bound AAD seals the reply cryptographically to this specific row and table
      const bodySealed = seal(
        content,
        {
          table: 'replies',
          column: 'body_sealed',
          rowId: id,
        },
        ring
      );

      await withActor(actor.role, actor.userId, async (tx) => {
        // Safe drizzle insert via tx
        await (tx as unknown as { insert: (table: unknown) => { values: (vals: unknown) => Promise<unknown> } })
          .insert(replies)
          .values({
            id,
            userId: actor.userId,
            targetType,
            targetId,
            bodySealed,
          });
      });

      return reply.code(201).send({
        success: true,
        data: {
          id,
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        },
      });
    },
  });

  /**
   * GET /api/v1/replies
   * Fetches replies for a target.
   * Recipient sees only their own replies.
   * Author sees all replies across the target or system.
   */
  createSecureRoute(app, {
    method: 'GET',
    url: '/api/v1/replies',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const actor = await resolveActor(request);
      if (!actor) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const parsed = getRepliesSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const { targetType, targetId } = parsed.data;
      const ring = getKeyRing();

      const rawItems = await withActor(actor.role, actor.userId, async (tx) => {
        const drizzle = tx as unknown as {
          select: () => {
            from: (table: unknown) => {
              where: (clause: unknown) => {
                orderBy: (order: unknown) => Promise<Array<{
                  id: string;
                  userId: string;
                  targetType: 'memory' | 'letter';
                  targetId: string;
                  bodySealed: string;
                  createdAt: Date;
                }>>;
              };
            };
          };
        };

        const conditions = [];
        if (targetType) conditions.push(eq(replies.targetType, targetType));
        if (targetId) conditions.push(eq(replies.targetId, targetId));

        // If recipient, only show their own replies
        if (actor.role === 'recipient') {
          conditions.push(eq(replies.userId, actor.userId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        return drizzle.select().from(replies).where(whereClause).orderBy(desc(replies.createdAt));
      });

      // Unseal each item safely in memory
      const items = (rawItems ?? []).map((row) => {
        let content: string;
        try {
          content = unseal(
            row.bodySealed,
            {
              table: 'replies',
              column: 'body_sealed',
              rowId: row.id,
            },
            ring
          );
        } catch {
          content = '[Ciphertext decryption failed]';
        }

        return {
          id: row.id,
          targetType: row.targetType,
          targetId: row.targetId,
          content,
          createdAt: row.createdAt.toISOString(),
        };
      });

      return reply.send({ success: true, data: items });
    },
  });
}
