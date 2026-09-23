import type { FastifyInstance, RouteOptions, RouteHandlerMethod } from 'fastify';

export type AuthLevel = 'public' | 'user' | 'admin';
export type PolicyRule = 'allow' | 'deny'; // placeholder for more complex AST

export interface SecureRouteOptions extends Omit<RouteOptions, 'handler'> {
  auth: AuthLevel;
  policy: PolicyRule;
  handler: RouteHandlerMethod;
}

export function createSecureRoute(app: FastifyInstance, options: SecureRouteOptions) {
  // At registration time, we assert that auth and policy are explicitly defined
  if (!options.auth || !options.policy) {
    throw new Error(`Route ${options.url} is missing auth or policy declaration.`);
  }

  app.route({
    ...options,
    preHandler: async (_request, _reply) => {
      void _request;
      void _reply;
      // In Phase 2 this will enforce auth and policy
      // For Phase 1 we just pass through
      if (options.auth === 'admin') {
         // evaluate admin check
      }
    },
    handler: options.handler
  });
}
