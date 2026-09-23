import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { resolveMediaAccess, resolveMediaAccessBatch } from '../media/access.js';
import { createPresignedUpload, completeUpload } from '../media/upload.js';
import { verifySession } from '../auth/sessions.js';

export async function mediaRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/media/access
   * Body: { assetId: string, variant: string }
   * Returns: { url, expiresAt }
   *
   * Auth: any authenticated session. RLS enforces visibility.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/media/access',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const sid = request.cookies['__Host-sl_sid'];
      if (!sid) return reply.code(401).send({ error: 'Unauthorized' });
      const session = await verifySession(sid);
      if (!session) return reply.code(401).send({ error: 'Unauthorized' });

      const { assetId, variant } = request.body as { assetId: string; variant: string };
      if (!assetId || !variant) return reply.code(400).send({ error: 'assetId and variant required' });

      try {
        const result = await resolveMediaAccess(
          assetId,
          variant as Parameters<typeof resolveMediaAccess>[1],
          session.userId
        );
        return reply.send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        const code = e.statusCode ?? 500;
        return reply.code(code).send({ error: e.message });
      }
    },
  });

  /**
   * POST /api/v1/media/access:batch
   * Body: { requests: Array<{ assetId, variant }> }
   * Max 24 items per batch (spec §14.4).
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/media/access:batch',
    auth: 'user',
    policy: 'allow',
    handler: async (request, reply) => {
      const sid = request.cookies['__Host-sl_sid'];
      if (!sid) return reply.code(401).send({ error: 'Unauthorized' });
      const session = await verifySession(sid);
      if (!session) return reply.code(401).send({ error: 'Unauthorized' });

      const { requests } = request.body as { requests: Parameters<typeof resolveMediaAccessBatch>[0] };
      if (!Array.isArray(requests)) return reply.code(400).send({ error: 'requests must be an array' });

      try {
        const results = await resolveMediaAccessBatch(requests, session.userId);
        return reply.send({ results });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },
  });

  /**
   * POST /api/v1/admin/media/uploads
   * Author-only: creates presigned POST fields for direct-to-S3 upload.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/admin/media/uploads',
    auth: 'admin',
    policy: 'allow',
    handler: async (request, reply) => {
      const sid = request.cookies['__Host-sl_sid'];
      if (!sid) return reply.code(401).send({ error: 'Unauthorized' });
      const session = await verifySession(sid);
      if (!session) return reply.code(401).send({ error: 'Unauthorized' });

      const { kind } = request.body as { kind: string };
      if (!['image', 'video', 'audio'].includes(kind)) {
        return reply.code(400).send({ error: 'kind must be image, video, or audio' });
      }

      const result = await createPresignedUpload(kind as 'image' | 'video' | 'audio', session.userId);
      return reply.send(result);
    },
  });

  /**
   * POST /api/v1/admin/media/uploads/:id/complete
   * Author-only: marks asset as processing and queues the worker job.
   */
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/admin/media/uploads/:id/complete',
    auth: 'admin',
    policy: 'allow',
    handler: async (request, reply) => {
      const sid = request.cookies['__Host-sl_sid'];
      if (!sid) return reply.code(401).send({ error: 'Unauthorized' });
      const session = await verifySession(sid);
      if (!session) return reply.code(401).send({ error: 'Unauthorized' });

      const { id } = request.params as { id: string };
      try {
        await completeUpload(id);
        return reply.send({ success: true });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },
  });
}
