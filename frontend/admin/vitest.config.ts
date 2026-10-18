import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
      // `server-only` throws on import so that a Next build fails loudly if a client component
      // ever pulls in a module holding a database connection string. That guard is for the
      // bundler; under vitest there is no client bundle, and letting it throw would mean the
      // server modules — where the password hashing and the identifier quoting live — could never
      // be tested at all. Stubbed, not removed: the import stays in the source, where it does its
      // real job.
      // `fileURLToPath`, not `.pathname`: a URL percent-encodes the path, so a checkout under a
      // directory whose name contains a space resolves to a file that does not exist.
      'server-only': fileURLToPath(new URL('./test-stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./test-setup.ts'],
  },
});
