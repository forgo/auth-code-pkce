/**
 * Factory for creating provider behaviors
 *
 * Creates the appropriate behavior implementation based on
 * the provider name in the configuration.
 */

import type { ProviderBehavior, ProviderTestConfig } from './types.js';
import { KeycloakBehavior } from './keycloak-behavior.js';
import { AuthentikBehavior } from './authentik-behavior.js';

/**
 * Create a provider behavior from a test config
 *
 * @param config - Provider test configuration
 * @returns The appropriate behavior implementation
 */
export function createBehavior(config: ProviderTestConfig): ProviderBehavior {
  const providerName = config.name.toLowerCase();

  if (providerName.includes('keycloak')) {
    return new KeycloakBehavior(config);
  }

  if (providerName.includes('authentik')) {
    return new AuthentikBehavior(config);
  }

  throw new Error(`Unknown provider: ${config.name}`);
}

/**
 * Build the app URL with provider config as query params
 *
 * @param behavior - The provider behavior
 * @param appPort - The app port
 * @param clientId - The OAuth client ID
 * @returns The full app URL with query params
 */
export function buildAppUrl(
  behavior: ProviderBehavior,
  appPort: number,
  clientId: string = 'test-spa'
): string {
  const baseUrl = `http://localhost:${appPort}`;
  const params = new URLSearchParams();

  params.set('providerType', behavior.getProviderType());
  params.set('providerUrl', behavior.config.baseUrl);
  params.set('clientId', clientId);

  // Add provider-specific params (realm for Keycloak, slug for Authentik)
  const providerParams = behavior.getUrlParams();
  for (const [key, value] of Object.entries(providerParams)) {
    params.set(key, value);
  }

  return `${baseUrl}?${params.toString()}`;
}
