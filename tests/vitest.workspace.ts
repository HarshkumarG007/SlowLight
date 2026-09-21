import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'api',
      root: './apps/api',
      environment: 'node',
      include: ['src/**/*.test.ts']
    }
  },
  {
    test: {
      name: 'rls',
      root: './tests',
      environment: 'node',
      include: ['rls/**/*.test.ts'],
      testTimeout: 30000 // Testcontainers may take time to start
    }
  }
]);
