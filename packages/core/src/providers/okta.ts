import type { ProviderPreset, ProviderConfig, ProviderPresetConfig } from "../types/provider.js";

/**
 * Default scopes for Okta
 */
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Okta provider preset
 *
 * Supports both default authorization server and custom authorization servers.
 *
 * @example
 * ```ts
 * // Default authorization server
 * const config = okta({
 *   issuer: 'https://dev-123456.okta.com',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 *
 * // Custom authorization server
 * const config = okta({
 *   issuer: 'https://dev-123456.okta.com/oauth2/custom',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 * ```
 */
export const okta: ProviderPreset = ({
  issuer,
  clientId,
  redirectUri,
  scopes = DEFAULT_SCOPES,
  postLogoutRedirectUri,
}: ProviderPresetConfig): ProviderConfig => {
  // Normalize issuer URL
  const normalizedIssuer = issuer.replace(/\/$/, "");

  // Check if custom authorization server is specified
  const hasCustomAuthServer = normalizedIssuer.includes("/oauth2/");

  // Build base URL for endpoints
  const baseUrl = hasCustomAuthServer
    ? normalizedIssuer
    : `${normalizedIssuer}/oauth2/default`;

  return {
    issuer: normalizedIssuer,
    clientId,
    redirectUri,
    scopes,
    postLogoutRedirectUri,
    endpoints: {
      authorizationEndpoint: `${baseUrl}/v1/authorize`,
      tokenEndpoint: `${baseUrl}/v1/token`,
      logoutEndpoint: `${baseUrl}/v1/logout`,
      userInfoEndpoint: `${baseUrl}/v1/userinfo`,
      revocationEndpoint: `${baseUrl}/v1/revoke`,
    },
  };
};
