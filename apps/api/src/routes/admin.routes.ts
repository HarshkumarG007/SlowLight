import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';

export async function adminRoutes(app: FastifyInstance) {
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/admin/media/upload',
    auth: 'admin',
    policy: 'allow',
    handler: async (request, reply) => {
      // Stub presigned POST url generation
      return reply.send({ url: 'http://s3.local/quarantine', fields: {} });
    }
  });

  createSecureRoute(app, {
    method: 'GET',
    url: '/api/v1/admin/audit',
    auth: 'admin',
    policy: 'allow',
    handler: async (request, reply) => {
      // Return mock audit logs
      return reply.send([
        { id: 1, action: 'LOGIN', timestamp: new Date() }
      ]);
    }
  });
  
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/admin/invites',
    auth: 'admin',
    policy: 'allow',
    handler: async (request, reply) => {
      // Return a mock invite
      return reply.send({ phrase: 'copper-mountain-sunset-breeze' });
    }
  });
}
