import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['adapters/**/*.ts'],
      exclude: ['adapters/**/*.test.ts', 'node_modules/']
    }
  },
  plugins: [tsconfigPaths()]
});
