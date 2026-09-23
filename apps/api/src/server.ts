import fastify from 'fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { logger } from './observability/logger.js';
import { authRoutes } from './routes/auth.routes.js';
import { buildKeyRing } from './crypto/keyring.js';
import { LocalKeyService, ensureLocalDevKey } from './crypto/localKeyService.js';
import { mediaRoutes } from './routes/media.routes.js';
import { worldRoutes } from './routes/world.routes.js';
import { memoryRoutes } from './routes/memories.routes.js';
import { letterRoutes } from './routes/letters.routes.js';
import { archiveRoutes } from './routes/archive.routes.js';
import { futureRoutes } from './routes/future.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { securityRoutes } from './routes/security.routes.js';
import { repliesRoutes } from './routes/replies.routes.js';
import { dbscRoutes } from './routes/dbsc.routes.js';
import { e2eeRoutes } from './routes/e2ee.routes.js';

const app = fastify({
  logger: logger,
  disableRequestLogging: true
});

// Request logging middleware
app.addHook('onRequest', (req, res, done) => {
  req.log.info({ req }, 'Incoming request');
  done();
});
app.addHook('onResponse', (req, res, done) => {
  req.log.info({ res, responseTime: res.elapsedTime }, 'Request completed');
  done();
});

// Security headers
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://*.amazonaws.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https://*.amazonaws.com'],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      requireTrustedTypesFor: ["'script'"],
      reportUri: '/api/v1/security/csp-report'
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Cookies
app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'fallback-secret-only-for-dev', 
  hook: 'onRequest'
});

// Health check
app.register(authRoutes);
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    // Boot the key ring before accepting traffic.
    // In production this calls KMS; in dev it uses LocalKeyService.
    if (env.NODE_ENV !== 'production') {
      await ensureLocalDevKey();
    }
    await buildKeyRing(LocalKeyService);

    app.register(authRoutes);
    app.register(mediaRoutes);
    app.register(worldRoutes);
    app.register(memoryRoutes);
    app.register(letterRoutes);
    app.register(archiveRoutes);
    app.register(futureRoutes);
    app.register(adminRoutes);
    app.register(securityRoutes);
    app.register(repliesRoutes);
    app.register(dbscRoutes);
    app.register(e2eeRoutes);

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
