import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Loads .env / .env.local so opt-in integration tests find their keys.
    setupFiles: ['./vitest.setup.mts'],
    // buildDocument reads templates relative to process.cwd().
    root: process.cwd(),
  },
});
