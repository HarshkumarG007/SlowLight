import { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { logger } from '../observability/logger.js';

export async function securityRoutes(app: FastifyInstance) {
  // CSP Report Endpoint
  createSecureRoute(app, {
    method: 'POST',
    url: '/api/v1/security/csp-report',
    auth: 'public', // Must be public as browser sends it transparently
    policy: 'allow',
    handler: async (request, reply) => {
      // The browser sends CSP violations as JSON under the body 'csp-report'
      logger.warn({ cspReport: request.body }, 'CSP Violation Detected');
      return reply.code(204).send();
    }
  });
}
