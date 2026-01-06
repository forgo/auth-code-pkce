import { keycloak, authentik, type ProviderConfig } from '@auth-code-pkce/core';

/**
 * Base configuration shared by all providers
 */
interface BaseAppConfig {
  providerUrl: string;
  clientId: string;
}

/**
 * Keycloak-specific configuration
 */
export interface KeycloakAppConfig extends BaseAppConfig {
  providerType: 'keycloak';
  realm: string;
}

/**
 * Authentik-specific configuration
 */
export interface AuthentikAppConfig extends BaseAppConfig {
  providerType: 'authentik';
  applicationSlug: string;
}

/**
 * App configuration - discriminated union of provider-specific configs
 */
export type AppConfig = KeycloakAppConfig | AuthentikAppConfig;

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
 * Returns provider-specific config based on providerType
 */
export function getAppConfig(): AppConfig {
  const providerType = getConfigValue('providerType', 'VITE_PROVIDER_TYPE', 'keycloak') as
    | 'keycloak'
    | 'authentik';

  const base = {
    providerUrl: getConfigValue('providerUrl', 'VITE_PROVIDER_URL', 'http://localhost:8026'),
    clientId: getConfigValue('clientId', 'VITE_CLIENT_ID', 'test-spa'),
  };

  if (providerType === 'keycloak') {
    return {
      ...base,
      providerType: 'keycloak',
      realm: getConfigValue('realm', 'VITE_KEYCLOAK_REALM', 'test-realm'),
    };
  }

  return {
    ...base,
    providerType: 'authentik',
    applicationSlug: getConfigValue('slug', 'VITE_AUTHENTIK_SLUG', 'test-spa'),
  };
}

/**
 * Build provider configuration from app config
 * Uses TypeScript type narrowing with discriminated union
 */
export function buildProviderConfig(config: AppConfig): ProviderConfig {
  const redirectUri = `${window.location.origin}/callback`;
  const postLogoutRedirectUri = window.location.origin;

  // Standard scopes without offline_access (requires special provider config)
  const scopes = ['openid', 'profile', 'email'];

  if (config.providerType === 'keycloak') {
    // TypeScript knows config is KeycloakAppConfig here
    return keycloak({
      issuer: `${config.providerUrl}/realms/${config.realm}`,
      clientId: config.clientId,
      redirectUri,
      postLogoutRedirectUri,
      scopes,
    });
  }

  // TypeScript knows config is AuthentikAppConfig here
  return authentik({
    issuer: `${config.providerUrl}/application/o/${config.applicationSlug}`,
    clientId: config.clientId,
    redirectUri,
    postLogoutRedirectUri,
    scopes,
  });
}
