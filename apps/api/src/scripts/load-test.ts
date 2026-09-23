#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { logger } from '../observability/logger.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'target': { type: 'string', short: 't', default: 'http://localhost:3000' },
    'requests': { type: 'string', short: 'n', default: '100' },
    'concurrency': { type: 'string', short: 'c', default: '10' }
  }
});

const TARGET = values.target;
const TOTAL_REQUESTS = parseInt(values.requests as string, 10);
const CONCURRENCY = parseInt(values.concurrency as string, 10);

async function worker(id: number, requestsPerWorker: number) {
  let success = 0;
  let rateLimited = 0;
  let errors = 0;

  for (let i = 0; i < requestsPerWorker; i++) {
    try {
      const res = await fetch(`${TARGET}/api/auth/login/options`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SL-Load-Test/1.0'
        }
      });

      if (res.status === 200) success++;
      else if (res.status === 429) rateLimited++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { success, rateLimited, errors };
}

async function main() {
  logger.info(`Starting Load & Abuse Test [Target: ${TARGET}] [Requests: ${TOTAL_REQUESTS}] [Concurrency: ${CONCURRENCY}]`);
  
  const startTime = Date.now();
  const requestsPerWorker = Math.ceil(TOTAL_REQUESTS / CONCURRENCY);
  
  const promises = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    promises.push(worker(i, requestsPerWorker));
  }

  const results = await Promise.all(promises);
  
  const total = results.reduce(
    (acc, curr) => ({
      success: acc.success + curr.success,
      rateLimited: acc.rateLimited + curr.rateLimited,
      errors: acc.errors + curr.errors
    }),
    { success: 0, rateLimited: 0, errors: 0 }
  );

  const duration = (Date.now() - startTime) / 1000;
  
  logger.info('--- Results ---');
  logger.info(`Duration:      ${duration.toFixed(2)}s`);
  logger.info(`Req/sec:       ${(TOTAL_REQUESTS / duration).toFixed(2)}`);
  logger.info(`Success (200): ${total.success}`);
  logger.info(`Rate Limit (429): ${total.rateLimited}`);
  logger.info(`Errors:        ${total.errors}`);

  if (total.rateLimited === 0 && TOTAL_REQUESTS > 50) {
    logger.warn('WARNING: Rate limits were not triggered! Is Redis/rate-limiter running?');
  }
}

main().catch(err => {
  logger.error(err);
  process.exit(1);
});
