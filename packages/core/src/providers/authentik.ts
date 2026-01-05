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
  // Normalize issuer URL (e.g., http://localhost:9024/application/o/my-app)
  const normalizedIssuer = issuer.replace(/\/$/, "");

  // Authentik uses global endpoints for auth/token but per-app for end-session
  // Extract base URL: http://localhost:9024/application/o from issuer
  const baseUrl = normalizedIssuer.replace(/\/[^/]+$/, "");

  return {
    issuer: normalizedIssuer,
    clientId,
    redirectUri,
    scopes,
    postLogoutRedirectUri,
    endpoints: {
      // Global endpoints (not per-application)
      authorizationEndpoint: `${baseUrl}/authorize/`,
      tokenEndpoint: `${baseUrl}/token/`,
      userInfoEndpoint: `${baseUrl}/userinfo/`,
      revocationEndpoint: `${baseUrl}/revoke/`,
      // Per-application endpoint
      logoutEndpoint: `${normalizedIssuer}/end-session/`,
    },
  };
};
