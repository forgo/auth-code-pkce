import { defineWorkspace } from 'vitest/config';
import path from 'path';

const rootDir = path.resolve(__dirname);

export default defineWorkspace([
  {
    test: {
      name: 'core',
      root: './packages/core',
      include: ['src/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.join(rootDir, 'vitest.setup.ts')],
    },
  },
  {
    test: {
      name: 'react',
      root: './packages/react',
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.join(rootDir, 'vitest.setup.ts')],
    },
  },
  {
    test: {
      name: 'vue',
      root: './packages/vue',
      include: ['src/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.join(rootDir, 'vitest.setup.ts')],
    },
  },
  {
    test: {
      name: 'svelte',
      root: './packages/svelte',
      include: ['src/**/*.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.join(rootDir, 'vitest.setup.ts')],
    },
  },
  {
    resolve: {
      alias: {
        '@auth-code-pkce/core': path.join(rootDir, 'packages/core/src/index.ts'),
        '@auth-code-pkce/react': path.join(rootDir, 'packages/react/src/index.ts'),
        '@auth-code-pkce/vue': path.join(rootDir, 'packages/vue/src/index.ts'),
        '@auth-code-pkce/svelte': path.join(rootDir, 'packages/svelte/src/index.ts'),
      },
    },
    test: {
      name: 'e2e',
      root: './e2e',
      include: ['**/*.test.ts'],
      environment: 'node',
      globals: true,
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  },
]);
