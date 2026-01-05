import type { ProviderPreset, ProviderConfig, ProviderPresetConfig } from "../types/provider.js";

/**
 * Default scopes for Keycloak
 */
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Keycloak provider preset
 *
 * @example
 * ```ts
 * const config = keycloak({
 *   issuer: 'https://keycloak.example.com/realms/myrealm',
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 * ```
 */
export const keycloak: ProviderPreset = ({
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
      authorizationEndpoint: `${normalizedIssuer}/protocol/openid-connect/auth`,
      tokenEndpoint: `${normalizedIssuer}/protocol/openid-connect/token`,
      logoutEndpoint: `${normalizedIssuer}/protocol/openid-connect/logout`,
      userInfoEndpoint: `${normalizedIssuer}/protocol/openid-connect/userinfo`,
      revocationEndpoint: `${normalizedIssuer}/protocol/openid-connect/revoke`,
    },
  };
};
