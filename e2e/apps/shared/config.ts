import { keycloak, authentik, type ProviderConfig } from '@auth-code-pkce/core';

/**
 * App configuration from URL params or environment variables
 */
export interface AppConfig {
  providerType: 'keycloak' | 'authentik';
  providerUrl: string;
  clientId: string;
  realm: string;
  applicationSlug: string;
}

/**
 * Get a config value from URL search params, localStorage, or env vars (in that order)
 * URL params take precedence to allow tests to configure the app at runtime
 */
function getConfigValue(key: string, envKey: string, defaultValue: string): string {
  // Check URL search params first (for test configuration)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlValue = urlParams.get(key);
    if (urlValue) {
      // Store in localStorage so it persists across redirects (OAuth callback)
      localStorage.setItem(`auth-config-${key}`, urlValue);
      return urlValue;
    }

    // Check localStorage (persisted from URL params)
    const storedValue = localStorage.getItem(`auth-config-${key}`);
    if (storedValue) {
      return storedValue;
    }
  }

  // Fall back to env vars
  const envValue = import.meta.env[envKey];
  if (envValue) {
    return envValue;
  }

  return defaultValue;
}

/**
 * Get app configuration - reads from URL params first (for tests), then env vars
 */
export function getAppConfig(): AppConfig {
  return {
    providerType: getConfigValue('providerType', 'VITE_PROVIDER_TYPE', 'keycloak') as
      | 'keycloak'
      | 'authentik',
    providerUrl: getConfigValue('providerUrl', 'VITE_PROVIDER_URL', 'http://localhost:8026'),
    clientId: getConfigValue('clientId', 'VITE_CLIENT_ID', 'test-spa'),
    realm: getConfigValue('realm', 'VITE_KEYCLOAK_REALM', 'test-realm'),
    applicationSlug: getConfigValue('slug', 'VITE_AUTHENTIK_SLUG', 'test-spa'),
  };
}

/**
 * Build provider configuration from app config
 */
export function buildProviderConfig(config: AppConfig): ProviderConfig {
  const redirectUri = `${window.location.origin}/callback`;
  const postLogoutRedirectUri = window.location.origin;

  // Standard scopes without offline_access (requires special provider config)
  const scopes = ['openid', 'profile', 'email'];

  if (config.providerType === 'keycloak') {
    return keycloak({
      issuer: `${config.providerUrl}/realms/${config.realm}`,
      clientId: config.clientId,
      redirectUri,
      postLogoutRedirectUri,
      scopes,
    });
  }

  // Authentik
  return authentik({
    issuer: `${config.providerUrl}/application/o/${config.applicationSlug}`,
    clientId: config.clientId,
    redirectUri,
    postLogoutRedirectUri,
    scopes,
  });
}
