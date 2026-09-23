import type { FastifyInstance } from 'fastify';
import { createSecureRoute } from './registry.js';
import { getLoginOptions, verifyLogin } from '../auth/login.js';
import { beginEnrollment, completeEnrollment } from '../auth/enrollment.js';
import { verifySession } from '../auth/sessions.js';

export async function authRoutes(app: FastifyInstance) {
  
  createSecureRoute(app, {
    method: 'GET',
    url: '/api/auth/login/options',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const options = await getLoginOptions();
      return reply.send(options);
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/login/verify',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const ua = request.headers['user-agent'] || 'Unknown';
      const ip = request.ip || '0.0.0.0';
      const token = await verifyLogin(request.body as Parameters<typeof verifyLogin>[0], ip, ua);
      
      reply.setCookie('__Host-sl_sid', token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
      
      return reply.send({ success: true });
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/enrollment/begin',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const { token, phrase } = request.body as { token: string; phrase: string };
      const options = await beginEnrollment(token, phrase);
      return reply.send(options);
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/enrollment/complete',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const { token, response } = request.body as {
        token: string;
        response: Parameters<typeof completeEnrollment>[1];
      };
      const ua = request.headers['user-agent'] || 'Unknown';
      const ip = request.ip || '0.0.0.0';
      const sessionToken = await completeEnrollment(token, response, ua, ip);
      
      reply.setCookie('__Host-sl_sid', sessionToken, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60
      });
      
      return reply.send({ success: true });
    }
  });

  createSecureRoute(app, {
    method: 'GET',
    url: '/api/auth/me',
    auth: 'public',
    policy: 'allow',
    handler: async (request, reply) => {
      const sid = request.cookies['__Host-sl_sid'];
      if (!sid) return reply.code(401).send({ error: 'Unauthorized' });
      
      const session = await verifySession(sid);
      if (!session) return reply.code(401).send({ error: 'Unauthorized' });
      
      return reply.send({ userId: session.userId, kind: session.kind });
    }
  });

  createSecureRoute(app, {
    method: 'POST',
    url: '/api/auth/logout',
    auth: 'public', // anyone can logout
    policy: 'allow',
    handler: async (request, reply) => {
      reply.clearCookie('__Host-sl_sid', {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      });
      reply.header('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
      return reply.send({ success: true });
    }
  });
}
