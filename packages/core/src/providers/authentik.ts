import type { ProviderPreset, ProviderConfig, ProviderPresetConfig } from "../types/provider.js";

/**
 * Default scopes for Authentik
 */
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Authentik provider preset
 *
 * @example
 * ```ts
 * const config = authentik({
 *   issuer: 'https://authentik.example.com/application/o/myapp',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 * ```
 */
export const authentik: ProviderPreset = ({
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
      authorizationEndpoint: `${normalizedIssuer}/authorize/`,
      tokenEndpoint: `${normalizedIssuer}/token/`,
      logoutEndpoint: `${normalizedIssuer}/end-session/`,
      userInfoEndpoint: `${normalizedIssuer}/userinfo/`,
      revocationEndpoint: `${normalizedIssuer}/revoke/`,
    },
  };
};
