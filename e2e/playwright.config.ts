import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests.
 *
 * Provider compliance tests (./providers):
 *   Tests OAuth provider implementations directly
 *   docker compose -f e2e/providers/keycloak/v26/docker-compose.yml up -d
 *   pnpm test:e2e:keycloak:v26
 *
 * Framework integration tests (./framework-tests):
 *   Tests @auth-code-pkce/* packages through real apps
 *   docker compose -f e2e/providers/keycloak/v26/docker-compose.yml up -d
 *   pnpm test:e2e:react:keycloak:v26
 */

// Environment variable to enable framework test web servers
const enableFrameworkApps = process.env.E2E_FRAMEWORK_TESTS === 'true';

// Define web servers based on test mode
const webServers = [];

// Always include callback server for provider tests (port 3000)
webServers.push({
  command: 'npx tsx ./providers/callback-server.ts',
  port: 3000,
  reuseExistingServer: !process.env.CI,
  timeout: 10000,
});

// Add framework app servers when running framework tests
if (enableFrameworkApps) {
  webServers.push(
    {
      command: 'pnpm --filter @auth-code-pkce/test-app-react dev',
      port: 3010,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm --filter @auth-code-pkce/test-app-vue dev',
      port: 3011,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm --filter @auth-code-pkce/test-app-svelte dev',
      port: 3012,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  );
}

export default defineConfig({
  testDir: './providers',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: webServers,

  projects: [
    // Keycloak versions
    {
      name: 'keycloak-v24',
      testDir: './providers/keycloak/v24',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'keycloak-v25',
      testDir: './providers/keycloak/v25',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'keycloak-v26',
      testDir: './providers/keycloak/v26',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Authentik versions
    {
      name: 'authentik-v2024-8',
      testDir: './providers/authentik/v2024-8',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authentik-v2024-12',
      testDir: './providers/authentik/v2024-12',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authentik-v2025-6',
      testDir: './providers/authentik/v2025-6',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Legacy aliases (run latest version)
    {
      name: 'keycloak',
      testDir: './providers/keycloak/v26',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authentik',
      testDir: './providers/authentik/v2025-6',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ===========================================
    // Framework Integration Tests
    // Tests @auth-code-pkce/* packages through real apps
    // ===========================================

    // React + Keycloak
    {
      name: 'react-keycloak-v24',
      testDir: './framework-tests/react',
      testMatch: 'keycloak-v24.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'react-keycloak-v25',
      testDir: './framework-tests/react',
      testMatch: 'keycloak-v25.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'react-keycloak-v26',
      testDir: './framework-tests/react',
      testMatch: 'keycloak-v26.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // React + Authentik
    {
      name: 'react-authentik-v2024-8',
      testDir: './framework-tests/react',
      testMatch: 'authentik-v2024-8.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'react-authentik-v2024-12',
      testDir: './framework-tests/react',
      testMatch: 'authentik-v2024-12.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'react-authentik-v2025-6',
      testDir: './framework-tests/react',
      testMatch: 'authentik-v2025-6.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Vue + Keycloak
    {
      name: 'vue-keycloak-v24',
      testDir: './framework-tests/vue',
      testMatch: 'keycloak-v24.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vue-keycloak-v25',
      testDir: './framework-tests/vue',
      testMatch: 'keycloak-v25.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vue-keycloak-v26',
      testDir: './framework-tests/vue',
      testMatch: 'keycloak-v26.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Vue + Authentik
    {
      name: 'vue-authentik-v2024-8',
      testDir: './framework-tests/vue',
      testMatch: 'authentik-v2024-8.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vue-authentik-v2024-12',
      testDir: './framework-tests/vue',
      testMatch: 'authentik-v2024-12.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'vue-authentik-v2025-6',
      testDir: './framework-tests/vue',
      testMatch: 'authentik-v2025-6.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Svelte + Keycloak
    {
      name: 'svelte-keycloak-v24',
      testDir: './framework-tests/svelte',
      testMatch: 'keycloak-v24.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'svelte-keycloak-v25',
      testDir: './framework-tests/svelte',
      testMatch: 'keycloak-v25.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'svelte-keycloak-v26',
      testDir: './framework-tests/svelte',
      testMatch: 'keycloak-v26.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Svelte + Authentik
    {
      name: 'svelte-authentik-v2024-8',
      testDir: './framework-tests/svelte',
      testMatch: 'authentik-v2024-8.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'svelte-authentik-v2024-12',
      testDir: './framework-tests/svelte',
      testMatch: 'authentik-v2024-12.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'svelte-authentik-v2025-6',
      testDir: './framework-tests/svelte',
      testMatch: 'authentik-v2025-6.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
