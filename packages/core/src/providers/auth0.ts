import type { ProviderPreset, ProviderConfig, ProviderPresetConfig } from "../types/provider.js";

/**
 * Default scopes for Auth0
 */
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Auth0 provider preset
 *
 * @example
 * ```ts
 * const config = auth0({
 *   issuer: 'https://your-tenant.auth0.com',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 * ```
 */
export const auth0: ProviderPreset = ({
  issuer,
  clientId,
  redirectUri,
  scopes = DEFAULT_SCOPES,
  postLogoutRedirectUri,
}: ProviderPresetConfig): ProviderConfig => {
  // Normalize issuer URL
  const normalizedIssuer = issuer.replace(/\/$/, "");

  return {
    issuer: normalizedIssuer,
    clientId,
    redirectUri,
    scopes,
    postLogoutRedirectUri,
    endpoints: {
      authorizationEndpoint: `${normalizedIssuer}/authorize`,
      tokenEndpoint: `${normalizedIssuer}/oauth/token`,
      logoutEndpoint: `${normalizedIssuer}/v2/logout`,
      userInfoEndpoint: `${normalizedIssuer}/userinfo`,
      revocationEndpoint: `${normalizedIssuer}/oauth/revoke`,
    },
    // Auth0 uses returnTo instead of post_logout_redirect_uri
    additionalAuthParams: postLogoutRedirectUri
      ? undefined
      : undefined,
  };
};
