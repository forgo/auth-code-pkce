#!/usr/bin/env npx tsx
/**
 * CLI entry point for provider initialization
 *
 * Usage:
 *   npx tsx e2e/testing-infrastructure/provider-init/cli.ts <provider> <version> <url> <container>
 *
 * Examples:
 *   npx tsx e2e/testing-infrastructure/provider-init/cli.ts authentik 2024.8 http://localhost:9024 auth-pkce-authentik-v2024-8-server
 *   npx tsx e2e/testing-infrastructure/provider-init/cli.ts authentik 2024.12 http://localhost:9025 auth-pkce-authentik-v2024-12-server
 *   npx tsx e2e/testing-infrastructure/provider-init/cli.ts authentik 2025.6 http://localhost:9026 auth-pkce-authentik-v2025-6-server
 */

import { createProviderInitializer, type ProviderType } from './factory.js';
import type { ProviderInitOptions } from './types.js';
import { DEFAULT_REDIRECT_URIS, DEFAULT_TEST_USER } from './types.js';

function printUsage(): void {
  console.log(`
Usage: npx tsx cli.ts <provider> <version> <url> <container>

Arguments:
  provider    Provider type (authentik, keycloak)
  version     Provider version (e.g., 2024.8, 2024.12, 2025.6 for Authentik)
  url         Base URL of the provider (e.g., http://localhost:9024)
  container   Docker container name for the provider

Examples:
  npx tsx cli.ts authentik 2024.8 http://localhost:9024 auth-pkce-authentik-v2024-8-server
  npx tsx cli.ts authentik 2024.12 http://localhost:9025 auth-pkce-authentik-v2024-12-server
  npx tsx cli.ts keycloak 26 http://localhost:8026 auth-pkce-keycloak-v26

Environment Variables:
  CLIENT_ID           OAuth client ID (default: test-spa)
  REDIRECT_URIS       Comma-separated redirect URIs (default: standard test ports)
  TEST_USERNAME       Test user username (default: testuser)
  TEST_PASSWORD       Test user password (default: testpassword123)
  TEST_EMAIL          Test user email (default: testuser@example.com)
`);
}

async function main(): Promise<void> {
  const [, , provider, version, url, container] = process.argv;

  // Validate arguments
  if (!provider || !version || !url || !container) {
    console.error('Error: Missing required arguments\n');
    printUsage();
    process.exit(1);
  }

  // Validate provider type
  if (provider !== 'authentik' && provider !== 'keycloak') {
    console.error(`Error: Unknown provider "${provider}". Must be "authentik" or "keycloak"\n`);
    printUsage();
    process.exit(1);
  }

  // Create initializer
  const initializer = createProviderInitializer(
    provider as ProviderType,
    version
  );

  if (!initializer) {
    console.log(`Provider ${provider} ${version} does not require programmatic initialization`);
    process.exit(0);
  }

  // Build options from environment or defaults
  const clientId = process.env.CLIENT_ID || 'test-spa';
  const redirectUris = process.env.REDIRECT_URIS
    ? process.env.REDIRECT_URIS.split(',')
    : DEFAULT_REDIRECT_URIS;

  const testUser = {
    username: process.env.TEST_USERNAME || DEFAULT_TEST_USER.username,
    password: process.env.TEST_PASSWORD || DEFAULT_TEST_USER.password,
    email: process.env.TEST_EMAIL || DEFAULT_TEST_USER.email,
  };

  const options: ProviderInitOptions = {
    baseUrl: url,
    containerName: container,
    client: {
      clientId,
      clientType: 'public',
      redirectUris,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    },
    testUsers: [testUser],
    timeout: 120000,
  };

  // Run initialization
  try {
    await initializer.initialize(options);
    process.exit(0);
  } catch (error) {
    console.error('\nInitialization failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
