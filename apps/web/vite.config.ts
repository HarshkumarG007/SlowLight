import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three']
        }
      }
    }
  },
  // Playwright e2e specs must be excluded from Vitest — they use Playwright's
  // own runner invoked separately via `pnpm e2e`.
  test: {
    exclude: [
      'tests/e2e/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
