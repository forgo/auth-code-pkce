/**
 * OAuth provider endpoint URLs
 */
export interface ProviderEndpoints {
  /** Authorization endpoint for initiating OAuth flow */
  authorizationEndpoint: string;
  /** Token endpoint for exchanging code for tokens */
  tokenEndpoint: string;
  /** Logout endpoint for ending sessions (optional) */
  logoutEndpoint?: string;
  /** UserInfo endpoint for fetching user profile (optional) */
  userInfoEndpoint?: string;
  /** Token revocation endpoint (optional) */
  revocationEndpoint?: string;
}

/**
 * Full provider configuration
 */
export interface ProviderConfig {
  /** OAuth provider base URL / issuer (e.g., https://dev-123456.okta.com) */
  issuer: string;

  /** OAuth client ID */
  clientId: string;

  /** Redirect URI for authorization callback */
  redirectUri: string;

  /** Requested OAuth scopes */
  scopes: string[];

  /** Provider endpoint URLs */
  endpoints: ProviderEndpoints;

  /** Post-logout redirect URI (optional) */
  postLogoutRedirectUri?: string;

  /** Additional parameters to include in authorization request (optional) */
  additionalAuthParams?: Record<string, string>;
}

/**
 * Minimal configuration for creating a provider preset
 */
export interface ProviderPresetConfig {
  /** OAuth provider base URL / issuer */
  issuer: string;
  /** OAuth client ID */
  clientId: string;
  /** Redirect URI for authorization callback */
  redirectUri: string;
  /** Requested OAuth scopes (optional, preset provides defaults) */
  scopes?: string[];
  /** Post-logout redirect URI (optional) */
  postLogoutRedirectUri?: string;
}

/**
 * Factory function signature for provider presets
 */
export type ProviderPreset = (config: ProviderPresetConfig) => ProviderConfig;
