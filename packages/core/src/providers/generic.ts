import type { ProviderConfig } from "../types/provider.js";

/**
 * Generic provider - pass through configuration directly
 *
 * Use this when you need full control over the provider configuration
 * or when using a provider not covered by the presets.
 *
 * @example
 * ```ts
 * const config = generic({
 *   issuer: 'https://my-oauth-server.com',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 *   scopes: ['openid', 'profile'],
 *   endpoints: {
 *     authorizationEndpoint: 'https://my-oauth-server.com/auth',
 *     tokenEndpoint: 'https://my-oauth-server.com/token',
 *     logoutEndpoint: 'https://my-oauth-server.com/logout',
 *   },
 * });
 * ```
 */
export function generic(config: ProviderConfig): ProviderConfig {
  return config;
}
